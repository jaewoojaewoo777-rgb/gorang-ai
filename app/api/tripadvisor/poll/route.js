import { NextResponse } from 'next/server'
import { getSession } from '../../../../lib/session'
import { supabaseAdmin } from '../../../../lib/db'
import Anthropic from '@anthropic-ai/sdk'
import { sendBadReviewAlert, sendReviewAlert } from '../../../../lib/solapi'

export const dynamic = 'force-dynamic'
export const maxDuration = 55

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const TA_KEY = process.env.TRIPADVISOR_API_KEY

async function fetchTAReviews(locationId) {
  const url = `https://api.content.tripadvisor.com/api/v1/location/${locationId}/reviews?key=${TA_KEY}&language=all`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`TripAdvisor API ${res.status}`)
  const data = await res.json()
  return data.data || []
}

async function analyzeReview(review) {
  const text = [review.title, review.text].filter(Boolean).join(' / ')
  const prompt = `당신은 제주도 소상공인(카페, 펜션, 맛집)의 트립어드바이저 리뷰 관리를 돕는 전문가입니다.

아래 리뷰를 분석해서 JSON으로만 응답하세요. 다른 텍스트 없이 JSON만.

리뷰 정보:
- 별점: ${review.rating}/5
- 작성자: ${review.user?.username || '익명'}
- 리뷰 내용: "${text}"

분석 항목:
1. type: "악성" (별1~2개 또는 허위/욕설) / "주의" (별3개 또는 아쉬운 내용) / "일반" (별4~5개 긍정)
2. language: 리뷰 언어 코드 (ko/en/zh/ja/기타)
3. korean_translation: 한국어가 아닌 경우 한국어로 번역 (한국어면 원문 그대로)
4. korean_summary: 핵심 요약 1~2문장 (한국어)
5. suggested_replies: 사장님이 쓸 수 있는 추천 답변 2개 (리뷰 언어로, 진심어린 톤)

응답 형식:
{
  "type": "악성"|"주의"|"일반",
  "language": "en",
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

  if (!TA_KEY) return NextResponse.json({ error: 'TRIPADVISOR_API_KEY 미설정' }, { status: 500 })

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('phone, shop_name, kakao_notify, tripadvisor_location_id')
    .eq('id', session.userId)
    .single()

  if (!user?.tripadvisor_location_id) {
    return NextResponse.json({ error: '트립어드바이저 장소 ID를 먼저 연동해주세요.' }, { status: 400 })
  }

  try {
    const reviews = await fetchTAReviews(user.tripadvisor_location_id)
    let newCount = 0
    const newReviews = []

    for (const r of reviews) {
      const reviewId = `ta_${r.id}`

      const { data: existing } = await supabaseAdmin
        .from('reviews')
        .select('id')
        .eq('review_id', reviewId)
        .eq('user_id', session.userId)
        .maybeSingle()

      if (existing) continue

      let analysis
      try {
        analysis = await analyzeReview(r)
      } catch {
        analysis = {
          type: r.rating <= 2 ? '악성' : r.rating === 3 ? '주의' : '일반',
          language: r.lang || 'en',
          korean_translation: r.text || '',
          korean_summary: (r.text || '').slice(0, 50),
          suggested_replies: [],
        }
      }

      const { error: insErr } = await supabaseAdmin.from('reviews').insert({
        user_id: session.userId,
        review_id: reviewId,
        reviewer_name: r.user?.username || '익명',
        star_rating: r.rating,
        comment: [r.title, r.text].filter(Boolean).join('\n'),
        create_time: r.published_date,
        review_type: analysis.type,
        language: analysis.language,
        korean_translation: analysis.korean_translation,
        korean_summary: analysis.korean_summary,
        suggested_replies: analysis.suggested_replies,
        reply_status: r.owner_response ? 'replied' : 'pending',
        existing_reply: r.owner_response?.text || null,
        notified: false,
      })

      if (!insErr) {
        newCount++
        newReviews.push({
          reviewId,
          type: analysis.type,
          starRating: r.rating,
          reviewerName: r.user?.username,
          koreanSummary: analysis.korean_summary,
          suggestedReplies: analysis.suggested_replies,
        })

        // 카톡 알림
        if (user.phone && user.kakao_notify !== false) {
          try {
            const shopLabel = `[트립어드바이저] ${user.shop_name || '내 가게'}`
            const [reply1] = analysis.suggested_replies
            if (analysis.type === '악성') {
              await sendBadReviewAlert({
                to: user.phone,
                shopName: shopLabel,
                star: r.rating,
                reviewerName: r.user?.username || '익명',
                summary: analysis.korean_summary,
                reply1: reply1 || '답변을 준비 중입니다.',
              })
            } else if (analysis.type === '주의') {
              await sendReviewAlert({
                to: user.phone,
                shopName: shopLabel,
                star: r.rating,
                reviewerName: r.user?.username || '익명',
                summary: analysis.korean_summary,
                reply1: reply1 || '',
              })
            }
            await supabaseAdmin.from('reviews').update({ notified: true })
              .eq('user_id', session.userId).eq('review_id', reviewId)
          } catch (e) {
            console.error('[TA] 카톡 알림 실패:', e.message)
          }
        }
      }
    }

    return NextResponse.json({ success: true, newReviews: newCount, reviews: newReviews })
  } catch (err) {
    console.error('[tripadvisor/poll]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
