import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_FILE = /\.(.*)$/

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // allow Next internals, API, static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/public') ||
    pathname === '/favicon.ico' ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next()
  }

  // allow unlock route
  if (pathname === '/unlock') return NextResponse.next()

  // validate session server-side by calling our session API and forwarding cookies
  try {
    const cookieHeader = req.headers.get('cookie') || ''
    const sessionUrl = new URL('/api/session', req.nextUrl.origin)
    const sessionRes = await fetch(sessionUrl.toString(), {
      method: 'GET',
      headers: { cookie: cookieHeader },
    })

    if (sessionRes && sessionRes.ok) {
      return NextResponse.next()
    }
  } catch (err) {
    // fallthrough to redirect
  }

  const url = req.nextUrl.clone()
  url.pathname = '/unlock'
  return NextResponse.redirect(url)
}
