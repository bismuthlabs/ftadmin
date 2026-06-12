import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getSupabaseAdminClient } from '../../../lib/supabaseAdmin'
import { createSession } from '../../../lib/session-store'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { passcode, remember } = body
    if (!passcode) return NextResponse.json({ error: 'passcode required' }, { status: 400 })

    const supabase = await getSupabaseAdminClient()
    const { data, error } = await supabase
      .from('access_codes')
      .select('*')
      .eq('active', true)
      .limit(1)
      .maybeSingle()

    if (error) throw error
    if (!data) return NextResponse.json({ error: 'no access codes configured' }, { status: 401 })

    const match = bcrypt.compareSync(passcode, data.code)
    if (!match) return NextResponse.json({ error: 'invalid passcode' }, { status: 401 })

    const session = await createSession(data.id, { remember: !!remember })

    const res = NextResponse.json({ ok: true })
    // set cookie
    res.cookies.set('pos_session', session.token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: Math.floor((session.expiresAt - session.issuedAt) / 1000),
    })

    return res
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
