import { NextResponse } from 'next/server'
import { deleteSessionByToken } from '../../../lib/session-store'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const token = body?.token || null

    if (token) {
      await deleteSessionByToken(token).catch(() => {})
    }

    const res = NextResponse.json({ ok: true })
    res.cookies.set('pos_session', '', { maxAge: 0, path: '/' })
    return res
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 })
  }
}
