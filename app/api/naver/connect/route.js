import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/db'
import { encrypt } from '../../../../lib/crypto'
import { verifyNaverSession } from '../../../../lib/naver'

// 크롬 확장(naver-extension)에서 호출. 세션(로그인 쿠키) 인증이 아니라
// 온보딩 화면에서 발급한 6자리 연동코드로 사용자를 식별한다.
export async function POST(req) {
  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: '잘못된 요청' }, { status: 400 })
  }

  const { pairingCode, cookies, placeId, bookingBusinessId } = body
  if (!pairingCode || !Array.isArray(cookies) || cookies.length === 0 || !placeId || !bookingBusinessId) {
    return NextResponse.json({ success: false, error: '필수 항목 누락 (스마트플레이스 리뷰 페이지를 먼저 열어주세요)' }, { status: 400 })
  }

  const { data: user, error: findErr } = await supabaseAdmin
    .from('users')
    .select('id, naver_pairing_code_expires_at')
    .eq('naver_pairing_code', pairingCode)
    .maybeSingle()

  if (findErr || !user) {
    return NextResponse.json({ success: false, error: '연동코드가 올바르지 않습니다.' }, { status: 400 })
  }

  if (!user.naver_pairing_code_expires_at || new Date(user.naver_pairing_code_expires_at) < new Date()) {
    return NextResponse.json({ success: false, error: '연동코드가 만료됐습니다. 다시 발급받아주세요.' }, { status: 400 })
  }

  // 워커가 아직 안 떠있거나 응답이 늦어도 세션 저장 자체는 성공시킨다 —
  // 유효성 재확인은 첫 폴링 때 다시 시도되면 됨.
  try {
    const verified = await verifyNaverSession(cookies, placeId, bookingBusinessId)
    if (!verified?.valid) {
      return NextResponse.json(
        { success: false, error: '네이버 로그인 세션이 유효하지 않습니다. 다시 로그인 후 시도해주세요.' },
        { status: 400 }
      )
    }
  } catch (e) {
    console.error('[naver/connect] 워커 검증 실패(계속 진행):', e.message)
  }

  const { encrypted, iv, authTag } = encrypt(JSON.stringify(cookies))

  const { error: upsertErr } = await supabaseAdmin.from('naver_connections').upsert(
    {
      user_id: user.id,
      place_id: placeId,
      booking_business_id: bookingBusinessId,
      encrypted_session: encrypted,
      session_iv: iv,
      session_auth_tag: authTag,
      session_captured_at: new Date().toISOString(),
      session_status: 'active',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )

  if (upsertErr) {
    return NextResponse.json({ success: false, error: upsertErr.message }, { status: 500 })
  }

  await supabaseAdmin
    .from('users')
    .update({ naver_pairing_code: null, naver_pairing_code_expires_at: null })
    .eq('id', user.id)

  return NextResponse.json({ success: true })
}
