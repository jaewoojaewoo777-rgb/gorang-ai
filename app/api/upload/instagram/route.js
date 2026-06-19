import { NextResponse } from 'next/server'
import { getSession } from '../../../../lib/session'
import { supabaseAdmin } from '../../../../lib/db'
import { uploadInstagramReels } from '../../../../lib/meta'
import { updateStreak } from '../../../../lib/streak'

export const maxDuration = 60

export async function POST(request) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  try {
    const formData = await request.formData()
    const videoUrl = formData.get('videoUrl')
    const caption  = formData.get('caption') || ''

    if (!videoUrl) return NextResponse.json({ error: '영상 URL 필요' }, { status: 400 })

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('meta_access_token, meta_token_expiry, instagram_user_id')
      .eq('id', session.userId)
      .single()

    if (!user?.meta_access_token || !user?.instagram_user_id) {
      return NextResponse.json({ error: 'Instagram 계정이 연동되지 않았어요. 연동 페이지에서 Meta 연동을 먼저 해주세요.' }, { status: 400 })
    }

    const mediaId = await uploadInstagramReels({
      igUserId: user.instagram_user_id,
      videoUrl,
      caption,
      userToken: user.meta_access_token,
    })

    await supabaseAdmin.from('video_uploads').insert({
      user_id: session.userId,
      caption_ko: caption,
      platforms: ['instagram'],
      status: 'done',
      instagram_media_id: mediaId,
    })

    await updateStreak(session.userId)

    return NextResponse.json({
      ok: true,
      mediaId,
      instagramUrl: `https://www.instagram.com/`,
    })
  } catch (err) {
    console.error('[Instagram] 업로드 오류:', err)
    return NextResponse.json({ error: '업로드 실패', detail: err.message }, { status: 500 })
  }
}
