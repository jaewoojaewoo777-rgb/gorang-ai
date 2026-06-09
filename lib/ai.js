import Anthropic from '@anthropic-ai/sdk'
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── AI 캡션 생성 (바이럴 훅 패턴 적용) ──────────────────────
export async function generateCaption({ shopName, shopLocation, shopType, customPrompt }) {
  const type = shopType === 'cafe' ? '카페' : '펜션/숙박'

  const baseInfo = `가게 정보:\n- 이름: ${shopName}\n- 위치: ${shopLocation || '제주도'}\n- 업종: ${type}`

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: `당신은 제주 관광업 SNS 바이럴 전문가입니다.
수백만 조회수를 기록한 제주 카페/펜션 릴스를 분석한 결과,
첫 문장(훅)이 스크롤을 멈추게 하는 핵심입니다.

${baseInfo}
${customPrompt ? `\n요청사항: ${customPrompt}` : ''}

아래 훅 패턴 중 이 가게에 가장 잘 맞는 것을 골라 첫 문장에 적용하세요:
- 희소성/한정 ("X시간이면 품절되는", "오픈런 필수")
- 비주얼 임팩트 ("한 폭의 그림 같은", "뷰 미쳤다")
- 독특한 경험 ("돌고래가 보이는", "비행기가 지나가는")
- 감탄형 ("실존한다니", "이런 곳이 있었어?")
- 비밀/숨겨진 ("숨겨진", "잘 모르는")

규칙:
- 첫 문장은 반드시 위 패턴 중 하나로 시작 (스크롤 멈추는 훅)
- 전체 2문장 이내, 짧고 임팩트 있게
- 해시태그 3개 포함
- 다른 설명 없이 캡션만 출력

🇰🇷 한국어 캡션:
🇺🇸 영어 캡션:
🇨🇳 중국어 캡션:
🇯🇵 일본어 캡션:`
    }]
  })
  return msg.content.map(c => c.text || '').join('')
}

// ── AI 리뷰 답변 생성 ──────────────────────────
export async function generateReviewReply({ shopName, reviewText, language }) {
  const langMap = { en: '영어', zh: '중국어', ja: '일본어', ko: '한국어' }
  const lang = langMap[language] || '한국어'
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: `당신은 제주 관광업 사장님의 구글 리뷰 답변 전문가입니다.
가게 이름: ${shopName}
리뷰 내용: ${reviewText}
답변 언어: ${lang}
위 리뷰에 ${lang}로 따뜻하고 진심 어린 답변을 작성해주세요.
- 3~5문장
- 방문 감사 + 구체적 내용 언급
- 재방문 유도
- 이모지 1~2개
- 답변만 출력 (다른 설명 없이)`
    }]
  })
  return msg.content.map(c => c.text || '').join('')
}
