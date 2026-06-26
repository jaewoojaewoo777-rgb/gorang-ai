import { NextResponse } from 'next/server'
import { getSession } from '../../../../lib/session'
import { supabaseAdmin } from '../../../../lib/db'
import { refreshTikTokToken, queryCreatorInfo } from '../../../../lib/tiktok'

export const runtime = 'nodejs'

// Direct Post 게시 화면 진입 시 호출 → 공개범위 옵션/닉네임/상호작용 가능여부를 프론트로 전달.
// (TikTok UX 가이드라인: 게시 전 creator_info를 받아 UI를 그 값으로 구성해야 함)
export async function GET() {
  const session = await getSession()
  if (!session.userId) {
    return NextResponse.json({ ok: false, error: '로그인 필요' }, { status: 401 })
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('tiktok_access_token, tiktok_refresh_token, tiktok_token_expiry')
    .eq('id', session.userId)
    .single()

  if (!user || !user.tiktok_access_token) {
    return NextResponse.json({ ok: false, error: 'not_connected' })
  }

  // 토큰 만료 임박 시 갱신 (업로드 라우트와 동일 패턴)
  let accessToken = user.tiktok_access_token
  const expiry = user.tiktok_token_expiry ? new Date(user.tiktok_token_expiry) : null
  if (!expiry || expiry.getTime() - Date.now() < 5 * 60 * 1000) {
    try {
      const refreshed = await refreshTikTokToken(user.tiktok_refresh_token)
      accessToken = refreshed.access_token
      await supabaseAdmin
        .from('users')
        .update({
          tiktok_access_token: refreshed.access_token,
          tiktok_refresh_token: refreshed.refresh_token || user.tiktok_refresh_token,
          tiktok_token_expiry: refreshed.expires_in
            ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
            : null,
        })
        .eq('id', session.userId)
    } catch (e) {
      return NextResponse.json({ ok: false, error: 'token_refresh_failed', detail: e.message })
    }
  }

  try {
    const info = await queryCreatorInfo(accessToken)
    // info: { creator_nickname, creator_username, creator_avatar_url,
    //         privacy_level_options, comment_disabled, duet_disabled,
    //         stitch_disabled, max_video_post_duration_sec }
    return NextResponse.json({ ok: true, creatorInfo: info })
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'creator_info_failed', detail: e.message })
  }
}
