import { NextResponse } from 'next/server'

const COOKIE_NAME = 'gorang_session'

export async function GET(request) {
  const response = NextResponse.redirect(new URL('/', request.url))
  // 세션 쿠키를 만료시켜서 실제로 로그아웃 처리
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
  })
  return response
}
