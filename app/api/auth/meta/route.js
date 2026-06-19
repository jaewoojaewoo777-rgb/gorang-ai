import { getMetaAuthUrl } from '../../../../lib/meta'
import { getSession } from '../../../../lib/session'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const session = await getSession()
  if (!session.userId) {
    return NextResponse.redirect(new URL('/connect?error=login_first', request.url))
  }

  const state = Math.random().toString(36).slice(2) + Date.now().toString(36)
  session.metaState = state
  await session.save()

  return NextResponse.redirect(getMetaAuthUrl(state))
}
