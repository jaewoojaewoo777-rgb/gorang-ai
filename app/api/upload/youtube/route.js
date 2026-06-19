import { NextResponse } from 'next/server'
import { getSession } from '../../../../lib/session'
import { supabaseAdmin } from '../../../../lib/db'
import { uploadYouTubeVideo, refreshAccessToken } from '../../../../lib/google'
import { updateStreak } from '../../../../lib/streak'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request) {
  const session = await getSession()
  console.log('[YouTube] session:', JSON.stringify(session))

  if (!session.userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  try {
    const formData = await request.formData()
    const file = formData.get('video')           // 직접 올린 영상 (기존 방식)
    const videoUrl = formData.get('videoUrl')    // Supabase URL (새 방식 — 모바일 부담 감소)
    const caption = formData.get('caption') || ''
    const title = formData.get('title') || '고랑AI 업로드'
    const isShorts = formData.get('isShorts') === 'true'

    if (!file && !videoUrl) return NextResponse.json({ error: '영상 파일 또는 URL 필요' }, { status: 400 })

    console.log('[YouTube] userId:', session.userId)

    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('google_access_token, google_refresh_token, google_token_expiry, shop_name')
      .eq('id', session.userId)
      .single()

    console.log('[YouTube] user:', user, 'userError:', userError)

    if (!user) return NextResponse.json({ error: '사용자 정보 없음', detail: userError?.message }, { status: 400 })

    // 토큰 갱신
    let accessToken = user.google_access_token
    const expiry = user.google_token_expiry ? new Date(user.google_token_expiry) : null
    if (!expiry || expiry.getTime() - Date.now() < 5 * 60 * 1000) {
      console.log('[YouTube] 토큰 갱신 중...')
      const newCreds = await refreshAccessToken(user.google_refresh_token)
      accessToken = newCreds.access_token
      await supabaseAdmin.from('users').update({
        google_access_token: accessToken,
        google_token_expiry: newCreds.expiry_date ? new Date(newCreds.expiry_date).toISOString() : null,
      }).eq('id', session.userId)
    }

    // videoUrl이 있으면 버퍼링 없이 URL 직접 전달 (resumable streaming)
    // 없으면 직접 업로드된 파일을 버퍼로 변환
    let videoBuffer = null
    let mimeType = 'video/mp4'
    if (!videoUrl) {
      console.log('[YouTube] 파일 버퍼 변환 중...')
      const arrayBuffer = await file.arrayBuffer()
      videoBuffer = Buffer.from(arrayBuffer)
      mimeType = file.type || 'video/mp4'
    }

    // Shorts 제목에 #Shorts 추가
    const finalTitle = isShorts ? `${title} #Shorts` : title

    // YouTube Resumable Upload (버퍼 없이 스트리밍)
    console.log('[YouTube] 업로드 시작:', finalTitle, videoUrl ? '(URL 스트리밍)' : '(파일 버퍼)')
    const ytResult = await uploadYouTubeVideo({
      accessToken,
      title: finalTitle || `${user.shop_name} - 고랑AI`,
      description: caption,
      videoBuffer,
      videoUrl: videoUrl || null,
      mimeType,
      isShorts,
    })

    console.log('[YouTube] 업로드 완료:', ytResult.id)

    // DB에 업로드 기록 저장
    await supabaseAdmin.from('video_uploads').insert({
      user_id: session.userId,
      title: finalTitle,
      caption_en: caption,
      platforms: ['youtube'],
      status: 'done',
      youtube_video_id: ytResult.id,
    })

    // ✅ Streak 업데이트
    await updateStreak(session.userId)

    const finalVideoUrl = isShorts
      ? `https://youtube.com/shorts/${ytResult.id}`
      : `https://youtube.com/watch?v=${ytResult.id}`

    return NextResponse.json({
      ok: true,
      youtubeVideoId: ytResult.id,
      youtubeUrl: finalVideoUrl,
    })
  } catch (err) {
    console.error('[YouTube] 업로드 오류:', err)
    return NextResponse.json({ error: '업로드 실패', detail: err.message }, { status: 500 })
  }
}
