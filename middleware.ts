import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const code = request.nextUrl.searchParams.get('code')

  // Agar code param hai (recovery) — allow karo
  if (code) {
    return NextResponse.next()
  }

  // Public paths
  const publicPaths = [
    '/login',
    '/signup',
    '/auth',
    '/pricing',
    '/pay',
    '/forgot-password',
    '/reset-password',
  ]
  const isPublic = publicPaths.some((p) => pathname.startsWith(p))

  if (isPublic) {
    return NextResponse.next()
  }

  const cookies = request.cookies.getAll()
  const hasAuth = cookies.some((c) =>
    c.name.startsWith('sb-') && c.name.includes('auth-token')
  )

  if (!hasAuth) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
