import { NextResponse } from 'next/server'
import { getSession } from '../../../../lib/session'
import { supabaseAdmin } from '../../../../lib/db'
import { decrypt } from '../../../../lib/crypto'
import { postNaverReply } from '../../../../lib/naver'

// 원탭 답변 게시: 카톡 알림에서 추천 답변 그대로, 또는 수정 후 전송
export async function POST(request) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { reviewId, replyText } = await request.json()
  if (!reviewId || !replyText) return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 })

  const { data: conn, error: connErr } = await supabaseAdmin
    .from('naver_connections')
    .select('*')
    .eq('user_id', session.userId)
    .single()

  if (connErr || !conn) {
    return NextResponse.json({ error: '네이버 플레이스 연동 정보 없음' }, { status: 400 })
  }

  try {
    const cookies = JSON.parse(
      decrypt({ encrypted: conn.encrypted_session, iv: conn.session_iv, authTag: conn.session_auth_tag })
    )

    // review_id는 nv_ 접두사가 붙어있으므로 워커에는 원본 네이버 리뷰 ID만 전달
    const naverReviewId = reviewId.startsWith('nv_') ? reviewId.slice(3) : reviewId
    const result = await postNaverReply(cookies, conn.place_id, conn.booking_business_id, naverReviewId, replyText)

    await supabaseAdmin.from('reviews').update({
      reply_status: 'replied',
      existing_reply: replyText,
    }).match({ user_id: session.userId, review_id: reviewId })

    return NextResponse.json({ ok: true, result })
  } catch (err) {
    console.error('[naver/reply] 답변 게시 오류:', err)
    return NextResponse.json({ error: '답변 게시 실패', detail: err.message }, { status: 500 })
  }
}
