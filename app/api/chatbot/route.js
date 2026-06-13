// app/api/chatbot/route.js
import { NextResponse } from 'next/server'
import { getSession } from '../../../lib/session'
import { supabaseAdmin } from '../../../lib/db'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 30

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── 고랑AI 매뉴얼 / FAQ (system prompt) ─────────────────────────
// 사장님이 자가 해결하도록 돕는 챗봇. 이 내용은 수시로 보강 가능.
const MANUAL = `
당신은 '고랑AI'의 친절한 고객지원 도우미입니다. 제주 카페·펜션·맛집·낚시/체험 업체 사장님들이 쓰는 SNS 마케팅 자동화 서비스입니다. 사장님이 앱 사용 중 궁금한 걸 물으면 쉽고 간단하게 답하세요.

[답변 원칙]
- 짧고 명확하게. 전문용어 쓰지 말고 사장님 눈높이로.
- 모르는 건 모른다고 하고, "고랑AI 운영팀에 문의해주세요"라고 안내.
- 친근한 한국어 존댓말. 이모지 약간 OK.
- 답을 모를 땐 지어내지 말 것.

[고랑AI 주요 기능]
1. 사진으로 영상 자동 제작: 가게 사진 여러 장 올리면 BGM·자막·효과 넣어서 릴스/쇼츠용 영상을 자동으로 만들어줍니다.
2. 사진+영상 합치기: 사진과 영상클립을 하나로 합쳐서 영상 제작. 순서도 정할 수 있어요.
3. 다채널 동시 업로드: 유튜브 쇼츠·인스타그램·틱톡에 한 번에 올립니다.
4. 구글맵 리뷰 AI 자동답변: 한국어·영어·중국어·일본어로 리뷰에 자동 답변.

[영상 만드는 법]
- 메뉴에서 '영상 만들기' → '사진으로 영상 만들기' 선택 → 사진 추가 → 업로드할 플랫폼 선택 → BGM 선택(자동/직접) → 캡션 설정 → 영상 제작.
- 캡션은 3가지: AI 자동생성 / 프롬프트로 만들기 / 직접 쓰기.
- BGM은 '자동'으로 하면 사진 분위기 보고 AI가 골라줍니다.

[요금제]
- 베이직: 월 29,000원
- 스탠다드: 월 59,000원
- 프로: 월 129,000원
- 엔터프라이즈: 별도 문의
(자세한 결제·환불은 운영팀 문의)

[자주 묻는 질문]
Q. 영상이 안 만들어져요.
A. 사진이 너무 크거나 많으면 시간이 걸려요. 사진 장수를 줄이거나 잠시 후 다시 시도해보세요. 계속 안 되면 운영팀에 문의해주세요.

Q. 유튜브/틱톡 업로드가 안 돼요.
A. 먼저 계정 연동이 되어 있어야 해요. 설정에서 채널 연동을 확인해주세요. 인스타그램은 현재 심사 중이라 곧 열릴 예정이에요.

Q. 영상에 원래 영상 소리가 안 나와요.
A. 사진+영상 합치기 모드에서는 영상 원음을 빼고 BGM만 깔립니다. 깔끔한 영상용이에요.

Q. 자막을 바꾸고 싶어요.
A. 캡션 설정 단계에서 '직접 쓰기'를 고르거나, AI가 만든 캡션을 수정할 수 있어요.

Q. 리뷰 답변 기능은 어떻게 켜요?
A. 구글 비즈니스 연동이 필요해요. 현재 구글 승인 대기 중인 기능이라 순차적으로 열릴 예정이에요.
`.trim()

// POST: 사장님 질문 → Claude 답변 + 로그 저장
export async function POST(req) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  try {
    const { question, history } = await req.json()
    if (!question?.trim()) return NextResponse.json({ error: '질문이 비었어요' }, { status: 400 })

    // 대화 맥락 (직전 몇 개만)
    const messages = []
    if (Array.isArray(history)) {
      for (const h of history.slice(-6)) {
        if (h.role && h.content) messages.push({ role: h.role, content: h.content })
      }
    }
    messages.push({ role: 'user', content: question })

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: MANUAL,
      messages,
    })

    const answer = msg.content[0]?.text?.trim() || '죄송해요, 답변을 못 만들었어요. 운영팀에 문의해주세요.'

    // 로그 저장 (그릇) — 실패해도 답변은 반환
    let logId = null
    try {
      const { data } = await supabaseAdmin
        .from('chatbot_logs')
        .insert({
          user_id: session.userId,
          question,
          answer,
          feedback: null,     // 1=도움됨, -1=별로 (나중에 PATCH)
          resolved: null,
        })
        .select('id')
        .single()
      logId = data?.id || null
    } catch (e) {
      console.error('chatbot_logs 저장 실패:', e.message)
    }

    return NextResponse.json({ ok: true, answer, logId })

  } catch (err) {
    console.error('[chatbot]', err)
    return NextResponse.json({ ok: false, error: '답변 생성 실패' }, { status: 500 })
  }
}

// PATCH: 피드백 (👍👎) 저장
export async function PATCH(req) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  try {
    const { logId, feedback } = await req.json()
    if (!logId) return NextResponse.json({ error: 'logId 필요' }, { status: 400 })

    await supabaseAdmin
      .from('chatbot_logs')
      .update({ feedback })   // 1 또는 -1
      .eq('id', logId)
      .eq('user_id', session.userId)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[chatbot PATCH]', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
