import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'

const sessionOptions = {
  password: process.env.SESSION_SECRET || 'gorang-ai-default-secret-change-me-32ch',
  cookieName: 'gorang_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30일
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
  },
}

export async function getSession() {
  const cookieStore = cookies()
  return getIronSession(cookieStore, sessionOptions)
}

export async function getSessionData() {
  const session = await getSession()
  return session
}
