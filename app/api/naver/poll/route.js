import { NextResponse } from 'next/server'
import { getSession } from '../../../../lib/session'
import { supabaseAdmin } from '../../../../lib/db'
import { decrypt } from '../../../../lib/crypto'
import { getNaverReviews } from '../../../../lib/naver'
import Anthropic from '@anthropic-ai/sdk'
import { sendBadReviewAlert, sendReviewAlert } from '../../../../lib/solapi'

export const dynamic = 'force-dynamic'
export const maxDuration = 55

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function analyzeReview(review) {
  const prompt = `당신은 제주도 소상공인(카페, 펜션, 맛집)의 네이버 플레이스 리뷰 관리를 돕는 전문가입니다.

아래 리뷰를 분석해서 JSON으로만 응답하세요. 다른 텍스트 없이 JSON만.

리뷰 정보:
- 별점: ${review.rating ?? '없음'}
- 작성자: ${review.author || '익명'}
- 리뷰 내용: "${review.text || ''}"

분석 항목:
1. type: "악성" (부정적/허위/욕설) / "주의" (아쉬운 내용) / "일반" (긍정적)
2. language: 리뷰 언어 코드 (ko/en/zh/ja/기타) — 네이버 리뷰는 대부분 ko
3. korean_translation: 한국어가 아닌 경우 한국어로 번역 (한국어면 원문 그대로)
4. korean_summary: 핵심 요약 1~2문장
5. suggested_replies: 사장님이 쓸 수 있는 추천 답변 2개 (한국어, 진심어린 톤)

응답 형식:
{
  "type": "악성"|"주의"|"일반",
  "language": "ko",
  "korean_translation": "...",
  "korean_summary": "...",
  "suggested_replies": ["답변1", "답변2"]
}`

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = msg.content[0].text.replace(/```json|```/g, '').trim()
  return JSON.parse(raw)
}

export async function POST() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const [{ data: user }, { data: conn, error: connErr }] = await Promise.all([
    supabaseAdmin.from('users').select('phone, shop_name, kakao_notify').eq('id', session.userId).single(),
    supabaseAdmin.from('naver_connections').select('*').eq('user_id', session.userId).single(),
  ])

  if (connErr || !conn) {
    return NextResponse.json({ error: '네이버 플레이스 연동을 먼저 진행해주세요.' }, { status: 400 })
  }

  if (conn.session_status !== 'active') {
    return NextResponse.json({ error: '네이버 세션이 만료됐습니다. 확장에서 다시 연결해주세요.' }, { status: 400 })
  }

  try {
    const cookies = JSON.parse(
      decrypt({ encrypted: conn.encrypted_session, iv: conn.session_iv, authTag: conn.session_auth_tag })
    )

    const reviews = await getNaverReviews(cookies, conn.place_id, conn.booking_business_id)
    console.log('[naver/poll] 워커에서 받은 리뷰 개수:', reviews.length, JSON.stringify(reviews.map(r => r.id)))

    // Vercel 함수 시간제한(55초) 안에 끝내야 해서 한 번에 처리할 리뷰 수를 제한한다.
    // 리뷰 43개를 한 번에 스크래핑+AI분석하면 타임아웃(504) 남. 처음 연동 시 과거 리뷰가
    // 많으면 "새 리뷰 확인"을 몇 번 더 눌러야 다 채워짐 — hasMore로 안내.
    const BATCH_SIZE = 5

    // DB에 이미 있는 건 미리 걸러서, 진짜 새 리뷰만 배치 크기만큼 추림
    const notYetInDb = []
    for (const r of reviews) {
      const reviewId = `nv_${r.id}`
      const { data: existing } = await supabaseAdmin
        .from('reviews')
        .select('id')
        .eq('review_id', reviewId)
        .eq('user_id', session.userId)
        .maybeSingle()
      if (!existing) notYetInDb.push(r)
    }

    const batch = notYetInDb.slice(0, BATCH_SIZE)
    const hasMore = notYetInDb.length > BATCH_SIZE
    console.log('[naver/poll] DB에 아직 없는 리뷰:', notYetInDb.length, '중 이번 배치:', batch.length)

    // AI 분석은 리뷰별로 독립적이라 병렬로 돌려서 시간을 줄인다 (직렬로 하면 8개만 해도 20~30초)
    const analyzed = await Promise.all(
      batch.map(async (r) => {
        let analysis
        try {
          analysis = await analyzeReview(r)
        } catch {
          analysis = {
            type: '일반',
            language: 'ko',
            korean_translation: r.text || '',
            korean_summary: (r.text || '').slice(0, 50),
            suggested_replies: [],
          }
        }
        return { r, analysis }
      })
    )

    let newCount = 0
    const newReviews = []

    for (const { r, analysis } of analyzed) {
      const reviewId = `nv_${r.id}`

      const { error: insErr } = await supabaseAdmin.from('reviews').insert({
        user_id: session.userId,
        review_id: reviewId,
        reviewer_name: r.author || '익명',
        star_rating: r.rating ?? null,
        comment: r.text || '',
        create_time: r.date || null,
        review_type: analysis.type,
        language: analysis.language,
        korean_summary: analysis.korean_summary,
        suggested_replies: analysis.suggested_replies,
        has_reply: r.hasReply || false,
        reply_text: r.existingReply || null,
        notified: false,
      })

      if (insErr) console.error('[naver/poll] 리뷰 저장 실패:', reviewId, JSON.stringify(insErr))

      if (!insErr) {
        newCount++
        newReviews.push({
          reviewId,
          type: analysis.type,
          starRating: r.rating,
          reviewerName: r.author,
          koreanSummary: analysis.korean_summary,
          suggestedReplies: analysis.suggested_replies,
        })

        if (user?.phone && user?.kakao_notify !== false) {
          try {
            const shopLabel = `[네이버] ${user.shop_name || '내 가게'}`
            const [reply1] = analysis.suggested_replies
            if (analysis.type === '악성') {
              await sendBadReviewAlert({
                to: user.phone,
                shopName: shopLabel,
                star: r.rating || 0,
                reviewerName: r.author || '익명',
                summary: analysis.korean_summary,
                reply1: reply1 || '답변을 준비 중입니다.',
              })
            } else if (analysis.type === '주의') {
              await sendReviewAlert({
                to: user.phone,
                shopName: shopLabel,
                star: r.rating || 0,
                reviewerName: r.author || '익명',
                summary: analysis.korean_summary,
                reply1: reply1 || '',
              })
            }
            await supabaseAdmin.from('reviews').update({ notified: true })
              .eq('user_id', session.userId).eq('review_id', reviewId)
          } catch (e) {
            console.error('[naver] 카톡 알림 실패:', e.message)
          }
        }
      }
    }

    await supabaseAdmin
      .from('naver_connections')
      .update({ last_polled_at: new Date().toISOString() })
      .eq('user_id', session.userId)

    return NextResponse.json({ success: true, newReviews: newCount, reviews: newReviews, hasMore })
  } catch (err) {
    console.error('[naver/poll]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
