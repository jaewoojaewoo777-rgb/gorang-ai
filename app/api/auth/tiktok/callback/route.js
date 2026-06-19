import { NextResponse } from 'next/server'
import { exchangeTikTokCode, getTikTokUserInfo } from '../../../../../lib/tiktok'
import { supabaseAdmin } from '../../../../../lib/db'
import { getSession } from '../../../../../lib/session'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const state = searchParams.get('state')

  const session = await getSession()

  if (error || !code) {
    return NextResponse.redirect(new URL('/connect?error=tiktok_cancelled', request.url))
  }
  if (!session.userId) {
    return NextResponse.redirect(new URL('/connect?error=login_first', request.url))
  }
  if (!state || state !== session.tiktokState) {
    return NextResponse.redirect(new URL('/connect?error=tiktok_state', request.url))
  }

  try {
    // 1. code → 토큰
    const token = await exchangeTikTokCode(code)

    // 2. 틱톡 사용자 이름 가져오기 (실패해도 무시)
    let displayName = null
    try {
      const info = await getTikTokUserInfo(token.access_token)
      displayName = info.display_name || null
    } catch (e) {
      console.log('틱톡 유저정보 조회 실패(무시):', e.message)
    }

    // 3. 만료 시각 계산 (기본 24시간)
    const expiry = new Date(
      Date.now() + (token.expires_in || 86400) * 1000
    ).toISOString()

    // 4. Supabase users 테이블에 틱톡 토큰 저장
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .update({
        tiktok_open_id: token.open_id,
        tiktok_access_token: token.access_token,
        tiktok_refresh_token: token.refresh_token,
        tiktok_token_expiry: expiry,
        tiktok_display_name: displayName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.userId)

    if (dbError) {
      console.error('틱톡 DB 저장 오류 (전체):', dbError.message)
      // 일부 컬럼이 없을 경우 최소한 open_id만이라도 저장
      const { error: fallbackErr } = await supabaseAdmin
        .from('users')
        .update({ tiktok_open_id: token.open_id, tiktok_display_name: displayName })
        .eq('id', session.userId)
      if (fallbackErr) console.error('틱톡 DB 최소 저장도 실패:', fallbackErr.message)
    }

    // 5. state 정리
    session.tiktokState = null
    await session.save()

    return NextResponse.redirect(new URL('/home', request.url))
  } catch (err) {
    console.error('틱톡 OAuth 오류:', err)
    return NextResponse.redirect(new URL('/connect?error=tiktok_failed', request.url))
  }
}
