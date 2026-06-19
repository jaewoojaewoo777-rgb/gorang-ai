import { NextResponse } from 'next/server'
import { getSession } from '../../../../lib/session'
import { supabaseAdmin } from '../../../../lib/db'
import { updateStreak } from '../../../../lib/streak'

export const maxDuration = 60

export async function POST(request) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  try {
    const formData = await request.formData()
    const videoUrl       = formData.get('videoUrl')
    const caption        = formData.get('caption') || ''
    const previewImageUrl = formData.get('previewImageUrl') || ''

    if (!videoUrl) return NextResponse.json({ error: '영상 URL 필요' }, { status: 400 })

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('line_channel_access_token')
      .eq('id', session.userId)
      .single()

    if (!user?.line_channel_access_token) {
      return NextResponse.json({ error: 'LINE Channel Access Token이 없어요. 연동 페이지에서 먼저 설정해주세요.' }, { status: 400 })
    }

    const token = user.line_channel_access_token

    // 팔로워 전체 발송: 영상 + 캡션 텍스트
    const messages = []

    if (previewImageUrl) {
      // 영상 메시지 (previewImageUrl 있을 때만)
      messages.push({
        type: 'video',
        originalContentUrl: videoUrl,
        previewImageUrl,
      })
    }

    if (caption) {
      messages.push({ type: 'text', text: caption.slice(0, 5000) })
    }

    if (messages.length === 0) {
      messages.push({ type: 'text', text: '새 영상이 업로드됐어요!' })
    }

    const broadcastRes = await fetch('https://api.line.me/v2/bot/message/broadcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ messages }),
    })

    const broadcastData = await broadcastRes.json()

    // LINE broadcast 성공 시 응답 body가 비어있음(200 OK)
    if (!broadcastRes.ok) {
      throw new Error(broadcastData.message || `LINE API 오류 (${broadcastRes.status})`)
    }

    await supabaseAdmin.from('video_uploads').insert({
      user_id: session.userId,
      caption_ko: caption,
      platforms: ['line'],
      status: 'done',
    })

    await updateStreak(session.userId)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[LINE] 발송 오류:', err)
    return NextResponse.json({ error: '발송 실패', detail: err.message }, { status: 500 })
  }
}
