import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSessionByToken } from '../../../lib/session-store'

export async function GET() {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('pos_session')?.value
    if (!token) return NextResponse.json({ authenticated: false }, { status: 401 })

    const session = await getSessionByToken(token)
    if (!session) {
      const res = NextResponse.json({ authenticated: false }, { status: 401 })
      res.cookies.set('pos_session', '', { maxAge: 0, path: '/' })
      return res
    }

    return NextResponse.json({ authenticated: true, session })
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 })
  }
}
