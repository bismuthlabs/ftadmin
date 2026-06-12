/**
 * Server-side Supabase admin client using SUPABASE_SERVICE_ROLE_KEY
 */

import type { SupabaseClient } from '@supabase/supabase-js'

let supabaseAdmin: SupabaseClient | null = null

export async function getSupabaseAdminClient(): Promise<SupabaseClient> {
  if (supabaseAdmin) return supabaseAdmin

  const { createClient } = await import('@supabase/supabase-js')
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase admin credentials not found')
  }

  supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  })

  return supabaseAdmin
}
