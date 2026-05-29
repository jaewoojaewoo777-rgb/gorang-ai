import { NextResponse } from 'next/server'
import { getSession } from '../../../lib/session'
import { supabaseAdmin } from '../../../lib/db'
import { getGBPReviews, postGBPReply, refreshAccessToken, detectLanguage } from '../../../lib/google'

async function getValidToken(userId) {
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('google_access_token, google_refresh_token, google_token_expiry')
    .eq('id', userId)
    .single()

  if (!user) throw new Error('사용자 없음')

  // 토큰 만료 확인 (5분 여유)
  const expiry = user.google_token_expiry ? new Date(user.google_token_expiry) : null
  const isExpired = expiry ? (expiry.getTime() - Date.now() < 5 * 60 * 1000) : true

  if (isExpired && user.google_refresh_token) {
    const newCreds = await refreshAccessToken(user.google_refresh_token)
    await supabaseAdmin.from('users').update({
      google_access_token: newCreds.access_token,
      google_token_expiry: newCreds.expiry_date ? new Date(newCreds.expiry_date).toISOString() : null,
    }).eq('id', userId)
    return newCreds.access_token
  }

  return user.google_access_token
}

// ── GET: 리뷰 목록 조회 ──────────────────────────
export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('gbp_account_id, gbp_location_id, shop_name')
    .eq('id', session.userId)
    .single()

  if (!user?.gbp_account_id || !user?.gbp_location_id) {
    return NextResponse.json({ reviews: [], message: 'GBP 연동 필요' })
  }

  try {
    const token = await getValidToken(session.userId)
    const reviews = await getGBPReviews(token, user.gbp_account_id, user.gbp_location_id)

    // 언어 감지 추가
    const enriched = reviews.map(r => ({
      ...r,
      detectedLang: detectLanguage(r.comment),
      hasReply: !!r.reviewReply,
    }))

    // Supabase에 캐시 저장
    for (const r of enriched) {
      await supabaseAdmin.from('reviews').upsert({
        user_id: session.userId,
        review_id: r.reviewId,
        reviewer_name: r.reviewer?.displayName,
        rating: r.starRating === 'FIVE' ? 5 : r.starRating === 'FOUR' ? 4 : r.starRating === 'THREE' ? 3 : r.starRating === 'TWO' ? 2 : 1,
        review_text: r.comment,
        language: r.detectedLang,
        has_reply: r.hasReply,
        raw_data: r,
      }, { onConflict: 'user_id,review_id' })
    }

    return NextResponse.json({ reviews: enriched })
  } catch (err) {
    console.error('리뷰 조회 오류:', err)
    return NextResponse.json({ error: '리뷰 조회 실패', detail: err.message }, { status: 500 })
  }
}

// ── POST: 리뷰 답변 게시 ─────────────────────────
export async function POST(request) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { reviewId, replyText } = await request.json()
  if (!reviewId || !replyText) return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 })

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('gbp_account_id, gbp_location_id')
    .eq('id', session.userId)
    .single()

  try {
    const token = await getValidToken(session.userId)
    const result = await postGBPReply(token, user.gbp_account_id, user.gbp_location_id, reviewId, replyText)

    // DB 업데이트
    await supabaseAdmin.from('reviews').update({
      reply_text: replyText,
      has_reply: true,
      replied_at: new Date().toISOString(),
    }).match({ user_id: session.userId, review_id: reviewId })

    return NextResponse.json({ ok: true, result })
  } catch (err) {
    console.error('답변 게시 오류:', err)
    return NextResponse.json({ error: '답변 게시 실패', detail: err.message }, { status: 500 })
  }
}
