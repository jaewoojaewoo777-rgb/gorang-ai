// app/api/reviews/poll/route.js
import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const sessionOptions = {
  password: process.env.SESSION_SECRET,
  cookieName: 'gorang-session',
};

// GBP API로 리뷰 목록 가져오기
async function fetchGBPReviews(accessToken, accountId, locationId) {
  const url = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GBP API 오류: ${res.status} ${err}`);
  }
  const data = await res.json();
  return data.reviews || [];
}

// GBP API로 리뷰에 답변 게시
export async function postGBPReply(accessToken, accountId, locationId, reviewId, replyText) {
  const url = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews/${reviewId}/reply`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ comment: replyText }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`답변 게시 오류: ${res.status} ${err}`);
  }
  return await res.json();
}

// Claude로 리뷰 분류 + 번역 + 추천 답변 생성
async function analyzeReview(review) {
  const reviewText = review.comment || '';
  const starRating = review.starRating; // ONE, TWO, THREE, FOUR, FIVE
  const reviewerName = review.reviewer?.displayName || '익명';

  const prompt = `당신은 제주도 소상공인(카페, 펜션, 맛집)의 구글맵 리뷰 관리를 돕는 전문가입니다.

아래 리뷰를 분석해서 JSON으로만 응답하세요. 다른 텍스트 없이 JSON만.

리뷰 정보:
- 별점: ${starRating}
- 작성자: ${reviewerName}
- 리뷰 내용: "${reviewText}"

분석 항목:
1. type: "악성" (허위사실, 욕설, 별1~2개 부정적) / "주의" (별3개 또는 아쉬운 내용) / "일반" (별4~5개 긍정적)
2. language: 리뷰 언어 코드 (ko/en/zh/ja/기타)
3. korean_translation: 한국어가 아닌 경우 한국어로 번역 (한국어면 원문 그대로)
4. korean_summary: 리뷰 핵심 요약 (한국어, 1~2문장)
5. suggested_replies: 사장님이 쓸 수 있는 추천 답변 2개 배열. 리뷰 언어로 작성. 진심어린 톤. 악성이면 침착하고 사실 기반으로.

응답 형식:
{
  "type": "악성"|"주의"|"일반",
  "language": "ko",
  "korean_translation": "...",
  "korean_summary": "...",
  "suggested_replies": ["답변1", "답변2"]
}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].text.trim();
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

// 별점 문자열 → 숫자 변환
function starRatingToNumber(starRating) {
  const map = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
  return map[starRating] || 0;
}

export async function POST(req) {
  try {
    const session = await getIronSession(cookies(), sessionOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '로그인 필요' }, { status: 401 });
    }

    const userId = session.user.id;

    // Supabase에서 사용자의 GBP 연결 정보 가져오기
    const { data: gbpConnection, error: connErr } = await supabase
      .from('gbp_connections')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (connErr || !gbpConnection) {
      return NextResponse.json({ error: 'GBP 연결 정보 없음' }, { status: 400 });
    }

    const { access_token, account_id, location_id } = gbpConnection;

    // GBP에서 최신 리뷰 가져오기
    const reviews = await fetchGBPReviews(access_token, account_id, location_id);

    let newCount = 0;
    const newReviews = [];

    for (const review of reviews) {
      const reviewId = review.reviewId;

      // 이미 저장된 리뷰인지 확인 (중복 방지)
      const { data: existing } = await supabase
        .from('reviews')
        .select('id')
        .eq('review_id', reviewId)
        .eq('user_id', userId)
        .single();

      if (existing) continue; // 이미 있으면 스킵

      // Claude로 분석
      let analysis = null;
      try {
        analysis = await analyzeReview(review);
      } catch (e) {
        console.error('Claude 분석 오류:', e);
        // 분석 실패해도 저장은 진행
        analysis = {
          type: '일반',
          language: 'ko',
          korean_translation: review.comment || '',
          korean_summary: review.comment?.slice(0, 50) || '',
          suggested_replies: [],
        };
      }

      const starNum = starRatingToNumber(review.starRating);

      // Supabase에 저장
      const { error: insertErr } = await supabase.from('reviews').insert({
        user_id: userId,
        review_id: reviewId,
        reviewer_name: review.reviewer?.displayName || '익명',
        star_rating: starNum,
        comment: review.comment || '',
        create_time: review.createTime,
        review_type: analysis.type,
        language: analysis.language,
        korean_translation: analysis.korean_translation,
        korean_summary: analysis.korean_summary,
        suggested_replies: analysis.suggested_replies,
        reply_status: review.reviewReply ? 'replied' : 'pending',
        existing_reply: review.reviewReply?.comment || null,
        notified: false,
      });

      if (!insertErr) {
        newCount++;
        newReviews.push({
          reviewId,
          type: analysis.type,
          starRating: starNum,
          reviewerName: review.reviewer?.displayName,
          koreanSummary: analysis.korean_summary,
          suggestedReplies: analysis.suggested_replies,
        });
      }
    }

    // 마지막 폴링 시간 업데이트
    await supabase
      .from('gbp_connections')
      .update({ last_polled_at: new Date().toISOString() })
      .eq('user_id', userId);

    return NextResponse.json({
      success: true,
      newReviews: newCount,
      reviews: newReviews,
    });
  } catch (err) {
    console.error('폴링 오류:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET: 저장된 리뷰 목록 조회
export async function GET(req) {
  try {
    const session = await getIronSession(cookies(), sessionOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '로그인 필요' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 악성 / 주의 / 일반
    const limit = parseInt(searchParams.get('limit') || '20');

    let query = supabase
      .from('reviews')
      .select('*')
      .eq('user_id', session.user.id)
      .order('create_time', { ascending: false })
      .limit(limit);

    if (type) query = query.eq('review_type', type);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ reviews: data });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
