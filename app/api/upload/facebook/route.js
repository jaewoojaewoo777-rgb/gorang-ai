import { NextResponse } from 'next/server'
import { getSession } from '../../../../lib/session'
import { supabaseAdmin } from '../../../../lib/db'
import { uploadFacebookVideo } from '../../../../lib/meta'
import { updateStreak } from '../../../../lib/streak'

export const maxDuration = 60

export async function POST(request) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  try {
    const formData = await request.formData()
    const videoUrl   = formData.get('videoUrl')
    const caption    = formData.get('caption') || ''
    const title      = formData.get('title') || ''

    if (!videoUrl) return NextResponse.json({ error: '영상 URL 필요' }, { status: 400 })

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('fb_page_id, fb_page_name, fb_page_access_token')
      .eq('id', session.userId)
      .single()

    if (!user?.fb_page_id || !user?.fb_page_access_token) {
      return NextResponse.json({ error: 'Facebook 페이지가 연동되지 않았어요. 연동 페이지에서 Meta 연동을 먼저 해주세요.' }, { status: 400 })
    }

    const videoId = await uploadFacebookVideo({
      pageId: user.fb_page_id,
      pageAccessToken: user.fb_page_access_token,
      videoUrl,
      description: caption,
      title,
    })

    await supabaseAdmin.from('video_uploads').insert({
      user_id: session.userId,
      title,
      caption_ko: caption,
      platforms: ['facebook'],
      status: 'done',
    })

    await updateStreak(session.userId)

    return NextResponse.json({
      ok: true,
      videoId,
      facebookUrl: `https://www.facebook.com/${user.fb_page_id}/videos/${videoId}`,
      pageName: user.fb_page_name,
    })
  } catch (err) {
    console.error('[Facebook] 업로드 오류:', err)
    return NextResponse.json({ error: '업로드 실패', detail: err.message }, { status: 500 })
  }
}
