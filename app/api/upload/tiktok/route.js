import { NextResponse } from 'next/server'
import { getSession } from '../../../../lib/session'
import { supabaseAdmin } from '../../../../lib/db'
import {
  uploadTikTokVideo,
  queryCreatorInfo,
  refreshTikTokToken,
  getTikTokPostStatus,
} from '../../../../lib/tiktok'

// 게시 상태 폴링 때문에 실행 시간을 넉넉히 잡음
export const maxDuration = 60

export async function POST(request) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  try {
    const formData = await request.formData()
    const file = formData.get('video')
    const caption = formData.get('caption') || '고랑AI'

    if (!file) return NextResponse.json({ error: '영상 파일 필요' }, { status: 400 })

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('tiktok_access_token, tiktok_refresh_token, tiktok_token_expiry')
      .eq('id', session.userId)
      .single()

    if (!user || !user.tiktok_access_token) {
      return NextResponse.json(
        { error: '틱톡 계정이 연동되지 않았어요. 먼저 연동해주세요.' },
        { status: 400 }
      )
    }

    // 토큰 갱신 (틱톡 액세스 토큰은 24시간 만료)
    let accessToken = user.tiktok_access_token
    const expiry = user.tiktok_token_expiry ? new Date(user.tiktok_token_expiry) : null
    if (!expiry || expiry.getTime() - Date.now() < 5 * 60 * 1000) {
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
    }

    // Direct Post 전 크리에이터 정보 조회 (틱톡 필수 단계)
    await queryCreatorInfo(accessToken)

    // 파일 → 버퍼
    const arrayBuffer = await file.arrayBuffer()
    const videoBuffer = Buffer.from(arrayBuffer)
    const mimeType = (file.type || 'video/mp4').split(';')[0]

    // 틱톡 업로드 (Direct Post · 심사 전이라 SELF_ONLY 비공개)
    const { publish_id } = await uploadTikTokVideo({ accessToken, caption, videoBuffer, mimeType })

    // === 게시 상태 폴링 (틱톡은 업로드 후 비동기로 처리함) ===
    let status = 'PROCESSING'
    let failReason = null
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 2500)) // 2.5초 간격
      const st = await getTikTokPostStatus(accessToken, publish_id)
      status = st.status || status
      if (status === 'PUBLISH_COMPLETE') break
      if (status === 'FAILED') {
        failReason = st.fail_reason || 'unknown'
        break
      }
    }

    // DB 기록 (실제 상태 반영)
    await supabaseAdmin.from('video_uploads').insert({
      user_id: session.userId,
      title: caption,
      caption_en: caption,
      platforms: ['tiktok'],
      status:
        status === 'PUBLISH_COMPLETE' ? 'done' : status === 'FAILED' ? 'failed' : 'processing',
      tiktok_publish_id: publish_id,
    })

    if (status === 'PUBLISH_COMPLETE') {
      return NextResponse.json({ ok: true, tiktokPublishId: publish_id, status })
    }
    if (status === 'FAILED') {
      return NextResponse.json({
        ok: false,
        error: '틱톡 게시 실패',
        detail: `사유: ${failReason}`,
        tiktokStatus: status,
      })
    }
    // 아직 처리 중 (드묾)
    return NextResponse.json({
      ok: false,
      error: '아직 처리 중',
      detail: `틱톡 상태: ${status} — 몇 분 뒤 틱톡 앱에서 확인해주세요`,
      tiktokStatus: status,
    })
  } catch (err) {
    console.error('틱톡 업로드 오류:', err)
    return NextResponse.json({ error: '업로드 실패', detail: err.message }, { status: 500 })
  }
}
