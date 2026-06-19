import { NextResponse } from 'next/server'
import { getSession } from '../../../../lib/session'
import { supabaseAdmin } from '../../../../lib/db'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  try {
    const { videoUrl, videoType, title } = await request.json()
    if (!videoUrl) return NextResponse.json({ error: 'videoUrl 필요' }, { status: 400 })

    const { error } = await supabaseAdmin.from('video_saves').insert({
      user_id: session.userId,
      video_url: videoUrl,
      video_type: videoType || 'portrait',
      title: title || null,
    })

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[video/save]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
