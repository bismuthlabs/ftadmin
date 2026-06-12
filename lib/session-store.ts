/**
 * lib/session-store.ts
 *
 * Supabase-backed session store (server-side).
 */
import crypto from 'crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

let supabaseAdmin: SupabaseClient | null = null
function getSupabaseAdminClient(): SupabaseClient {
  if (supabaseAdmin) return supabaseAdmin
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL must be set on server')
  }
  supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  return supabaseAdmin
}

export const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'pos_session'
export const DEFAULT_TTL_SECONDS = Number(process.env.SESSION_TTL_SECONDS || 3600)
export const REMEMBER_TTL_SECONDS = Number(process.env.SESSION_TTL_REMEMBER_SECONDS || DEFAULT_TTL_SECONDS * 24)

export type SessionPayload = {
  accessCodeId: string
  role: string
  roleName?: string | null
  permissionProfile: string
  issuedAt: number
  expiresAt: number
}

export async function createSession(accessCodeId: string, opts?: { remember?: boolean; ttlSeconds?: number }) {
  const remember = !!opts?.remember
  const ttl = opts?.ttlSeconds ?? (remember ? REMEMBER_TTL_SECONDS : DEFAULT_TTL_SECONDS)
  const token = crypto.randomBytes(28).toString('hex')
  const issuedAt = Date.now()
  const expiresAt = issuedAt + ttl * 1000

  const supabase = getSupabaseAdminClient()
  const { error } = await supabase.from('sessions').insert({
    token,
    access_code_id: accessCodeId,
    expires_at: new Date(expiresAt).toISOString(),
    created_at: new Date(issuedAt).toISOString(),
    last_seen_at: new Date(issuedAt).toISOString(),
  })

  if (error) throw error

  return { token, issuedAt, expiresAt, ttlSeconds: ttl }
}

export async function getSessionByToken(token: string): Promise<SessionPayload | null> {
  if (!token) return null
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from('sessions')
    .select('token, access_code_id, expires_at, created_at, access_codes ( id, role, role_name, permission_profile, active )')
    .eq('token', token)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const row: any = data
  const accessCode = row.access_codes
  if (!accessCode || accessCode.active !== true) return null

  const expiresAt = new Date(row.expires_at).getTime()
  if (expiresAt < Date.now()) {
    await supabase.from('sessions').delete().eq('token', token)
    return null
  }

  return {
    accessCodeId: row.access_code_id,
    role: accessCode.role,
    roleName: accessCode.role_name || accessCode.role,
    permissionProfile: accessCode.permission_profile,
    issuedAt: new Date(row.created_at).getTime(),
    expiresAt,
  }
}

export async function deleteSessionByToken(token: string): Promise<boolean> {
  if (!token) return false
  const supabase = getSupabaseAdminClient()
  const { error } = await supabase.from('sessions').delete().eq('token', token)
  if (error) throw error
  return true
}

export async function extendSession(token: string, opts?: { remember?: boolean; ttlSeconds?: number }): Promise<boolean> {
  if (!token) return false
  const remember = !!opts?.remember
  const ttl = opts?.ttlSeconds ?? (remember ? REMEMBER_TTL_SECONDS : DEFAULT_TTL_SECONDS)
  const newExpiresAt = new Date(Date.now() + ttl * 1000).toISOString()
  const supabase = getSupabaseAdminClient()
  const { error } = await supabase.from('sessions').update({ expires_at: newExpiresAt, last_seen_at: new Date().toISOString() }).eq('token', token)
  if (error) throw error
  return true
}

export const sessionStore = { createSession, getSessionByToken, deleteSessionByToken, extendSession }
