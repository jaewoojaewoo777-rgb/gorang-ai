import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── AI 캡션 생성 (3개 언어) ──────────────────────

export async function generateCaption({ shopName, shopLocation, shopType }) {
  const type = shopType === 'cafe' ? '카페' : '펜션/숙박'
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 800,
    messages: [{
      role: 'user',
      content: `당신은 제주 관광업 SNS 마케팅 전문가입니다.

가게 정보:
- 이름: ${shopName}
- 위치: ${shopLocation || '제주도'}
- 업종: ${type}

아래 3개 언어로 인스타그램/유튜브/틱톡 영상 캡션을 각각 작성해주세요.
각 언어 앞에 국기 이모지를 붙이고, 해시태그 3개씩 포함해주세요.
다른 설명 없이 캡션만 출력하세요.

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
    model: 'claude-sonnet-4-20250514',
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
