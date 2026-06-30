import { NextResponse } from 'next/server'
import { getSession } from '../../../../lib/session'
import { supabaseAdmin } from '../../../../lib/db'

// 플랫폼별로 비울(=연동해제) 컬럼들.
// google: 로그인 식별자(google_id/email/google_name)는 유지하고 토큰·GBP만 해제 → 로그인은 풀리지 않음.
const PLATFORM_FIELDS = {
  google: ['google_access_token', 'google_refresh_token', 'google_token_expiry', 'gbp_account_id', 'gbp_location_id'],
  instagram: ['meta_access_token', 'meta_token_expiry', 'instagram_user_id', 'fb_page_id', 'fb_page_name', 'fb_page_access_token'],
  tiktok: ['tiktok_open_id', 'tiktok_access_token', 'tiktok_refresh_token', 'tiktok_display_name'],
  line: ['line_channel_access_token', 'line_bot_name'],
  tripadvisor: ['tripadvisor_location_id', 'tripadvisor_location_name'],
}

export async function POST(request) {
  const session = await getSession()
  if (!session.userId) {
    return NextResponse.json({ error: '로그인 필요' }, { status: 401 })
  }

  const { platform } = await request.json().catch(() => ({}))
  const cols = PLATFORM_FIELDS[platform]
  if (!cols) {
    return NextResponse.json({ error: '알 수 없는 플랫폼' }, { status: 400 })
  }

  // DB에 실제 존재하는 컬럼만 null 처리 (없는 컬럼을 넣으면 업데이트 전체가 실패하므로) — /api/shop 과 동일한 안전장치
  const { data: user, error: readErr } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', session.userId)
    .single()
  if (readErr || !user) {
    return NextResponse.json({ error: '사용자 조회 실패' }, { status: 500 })
  }

  const update = { updated_at: new Date().toISOString() }
  for (const c of cols) {
    if (c in user) update[c] = null
  }

  const { error } = await supabaseAdmin
    .from('users')
    .update(update)
    .eq('id', session.userId)

  if (error) {
    console.error(`${platform} disconnect error:`, error)
    return NextResponse.json({ error: '연동 해제 실패' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
