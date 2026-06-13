import { NextResponse } from 'next/server'
import { getSession } from '../../../../lib/session'
import { supabaseAdmin } from '../../../../lib/db'
import {
  uploadTikTokVideo,
  queryCreatorInfo,
  refreshTikTokToken,
  getTikTokPostStatus,
} from '../../../../lib/tiktok'
import { v2 as cloudinary } from 'cloudinary'
import { updateStreak } from '../../../../lib/streak'

export const runtime = 'nodejs'
export const maxDuration = 60

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// webm 등 → mp4 (일정 프레임레이트 CFR로 강제 재인코딩)
async function convertToMp4(buffer) {
  const transform = { video_codec: 'h264', audio_codec: 'aac', fps: '24-30' }

  const uploaded = await new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          resource_type: 'video',
          folder: 'gorang_tiktok',
          eager: [{ transformation: [transform], format: 'mp4' }],
          eager_async: false,
        },
        (error, result) => (error ? reject(error) : resolve(result))
      )
      .end(buffer)
  })

  const meta = {
    fps: uploaded && uploaded.frame_rate,
    frames: uploaded && uploaded.nb_frames,
    duration: uploaded && uploaded.duration,
  }

  let mp4Url = uploaded && uploaded.eager && uploaded.eager[0] && uploaded.eager[0].secure_url
  if (!mp4Url) {
    mp4Url = cloudinary.url(uploaded.public_id, {
      resource_type: 'video',
      transformation: [transform],
      format: 'mp4',
    })
  }

  let mp4Buffer = null
  for (let i = 0; i < 8; i++) {
    const resp = await fetch(mp4Url)
    if (resp.ok) {
      const ct = (resp.headers.get('content-type') || '').toLowerCase()
      if (ct.includes('video') || ct.includes('mp4')) {
        const ab = await resp.arrayBuffer()
        if (ab.byteLength > 1000) {
          mp4Buffer = Buffer.from(ab)
          break
        }
      }
    }
    await new Promise((r) => setTimeout(r, 2500))
  }

  try {
    await cloudinary.uploader.destroy(uploaded.public_id, { resource_type: 'video' })
  } catch (_) {}

  if (!mp4Buffer) throw new Error('Cloudinary mp4 변환 시간 초과')
  return { buffer: mp4Buffer, meta }
}

export async function POST(request) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  try {
    const formData = await request.formData()
    const file = formData.get('video')
    const videoUrl = formData.get('videoUrl')   // Supabase URL (모바일 부담 ↓)
    const caption = formData.get('caption') || '고랑AI'
    if (!file && !videoUrl) return NextResponse.json({ error: '영상 파일 또는 URL 필요' }, { status: 400 })

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

    await queryCreatorInfo(accessToken)

    const reqStart = Date.now()
    let videoBuffer
    if (videoUrl) {
      // 서버가 Supabase URL에서 직접 다운로드
      const videoRes = await fetch(videoUrl)
      if (!videoRes.ok) {
        return NextResponse.json({ error: '영상 다운로드 실패', detail: `status ${videoRes.status}` }, { status: 500 })
      }
      const ab = await videoRes.arrayBuffer()
      videoBuffer = Buffer.from(ab)
    } else {
      const arrayBuffer = await file.arrayBuffer()
      videoBuffer = Buffer.from(arrayBuffer)
    }

    const conv = await convertToMp4(videoBuffer)
    videoBuffer = conv.buffer
    const srcMeta = conv.meta

    const { publish_id } = await uploadTikTokVideo({
      accessToken,
      caption,
      videoBuffer,
      mimeType: 'video/mp4',
    })

    let status = 'PROCESSING'
    let failReason = null
    let polls = 0
    while (Date.now() - reqStart < 52000) {
      await new Promise((r) => setTimeout(r, 3000))
      polls++
      const st = await getTikTokPostStatus(accessToken, publish_id)
      status = st.status || status
      if (status === 'PUBLISH_COMPLETE') break
      if (status === 'FAILED') {
        failReason = st.fail_reason || 'unknown'
        break
      }
    }

    await supabaseAdmin.from('video_uploads').insert({
      user_id: session.userId,
      title: caption,
      caption_en: caption,
      platforms: ['tiktok'],
      status:
        status === 'PUBLISH_COMPLETE' ? 'done' : status === 'FAILED' ? 'failed' : 'processing',
      tiktok_publish_id: publish_id,
    })

    // ✅ PUBLISH_COMPLETE 됐을 때만 streak 업데이트
    if (status === 'PUBLISH_COMPLETE') {
      await updateStreak(session.userId)
    }

    const metaStr = ` | 원본fps:${srcMeta ? srcMeta.fps : '?'} 길이:${srcMeta ? srcMeta.duration : '?'}s 폴링${polls}회`

    if (status === 'PUBLISH_COMPLETE') {
      return NextResponse.json({ ok: true, tiktokPublishId: publish_id, status })
    }
    if (status === 'FAILED') {
      return NextResponse.json({
        ok: false,
        error: '틱톡 게시 실패',
        detail: `사유: ${failReason}${metaStr}`,
        tiktokStatus: status,
      })
    }
    return NextResponse.json({
      ok: false,
      error: '아직 처리 중',
      detail: `틱톡 상태: ${status} — 몇 분 뒤 틱톡 앱에서 확인해주세요${metaStr}`,
      tiktokStatus: status,
    })
  } catch (err) {
    console.error('틱톡 업로드 오류:', err)
    return NextResponse.json({ error: '업로드 실패', detail: err.message }, { status: 500 })
  }
}
