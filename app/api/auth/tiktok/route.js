import { getTikTokAuthUrl } from '../../../../lib/tiktok'
import { getSession } from '../../../../lib/session'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const session = await getSession()

  // 틱톡은 로그인된 사용자 계정에 연결하므로, 먼저 구글 로그인 필요
  if (!session.userId) {
    return NextResponse.redirect(new URL('/connect?error=login_first', request.url))
  }

  // CSRF 방지용 state 생성 후 세션에 저장
  const state = Math.random().toString(36).slice(2) + Date.now().toString(36)
  session.tiktokState = state
  await session.save()

  return NextResponse.redirect(getTikTokAuthUrl(state))
}
