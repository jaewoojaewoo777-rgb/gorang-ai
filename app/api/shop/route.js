import { NextResponse } from 'next/server'
import { getSession } from '../../../lib/session'
import { supabaseAdmin } from '../../../lib/db'

export async function POST(request) {
  const session = await getSession()
  if (!session.userId) {
    return NextResponse.json({ error: '로그인 필요' }, { status: 401 })
  }

  const body = await request.json()
  const { shopName, shopType, shopLocation, shopIntro } = body

  const { error } = await supabaseAdmin
    .from('users')
    .update({ shop_name: shopName, shop_type: shopType, shop_location: shopLocation, shop_intro: shopIntro })
    .eq('id', session.userId)

  if (error) {
    console.error('shop save error:', error)
    return NextResponse.json({ error: '저장 실패' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('users')
    .select('shop_name, shop_type, shop_location, shop_intro, email, google_name, google_id, gbp_account_id, gbp_location_id, tiktok_open_id, tiktok_display_name, instagram_user_id, tripadvisor_location_id, tripadvisor_location_name')
    .eq('id', session.userId)
    .single()

  if (!data) return NextResponse.json({})
  const { google_id, ...rest } = data
  // google_id 존재 = 구글 계정으로 로그인됨 = YouTube 사용 가능
  return NextResponse.json({ ...rest, google_connected: !!google_id })
}
