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

  // 컬럼명을 나열하면 DB에 없는 컬럼이 하나라도 있을 때 쿼리 전체가 실패 → {} 반환됨.
  // 그래서 * 로 전부 가져온 뒤, 화면에 필요한 값만 골라서 응답 (토큰 등 민감정보는 제외).
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', session.userId)
    .single()

  if (error) console.error('shop GET error:', error.message)
  if (!data) return NextResponse.json({})

  return NextResponse.json({
    shop_name: data.shop_name ?? null,
    shop_type: data.shop_type ?? null,
    shop_location: data.shop_location ?? null,
    shop_intro: data.shop_intro ?? null,
    email: data.email ?? null,
    google_name: data.google_name ?? null,
    gbp_account_id: data.gbp_account_id ?? null,
    gbp_location_id: data.gbp_location_id ?? null,
    tiktok_open_id: data.tiktok_open_id ?? null,
    tiktok_display_name: data.tiktok_display_name ?? null,
    instagram_user_id: data.instagram_user_id ?? null,
    tripadvisor_location_id: data.tripadvisor_location_id ?? null,
    tripadvisor_location_name: data.tripadvisor_location_name ?? null,
    google_connected: !!data.google_id,
  })
}
