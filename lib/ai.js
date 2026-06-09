import Anthropic from '@anthropic-ai/sdk'
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── AI 캡션 생성 ──────────────────────────────────────────────
export async function generateCaption({ shopName, shopLocation, shopType, customPrompt }) {
  const type = shopType === 'cafe' ? '카페' : '펜션/숙박'
  const baseInfo = `가게 정보:\n- 이름: ${shopName}\n- 위치: ${shopLocation || '제주도'}\n- 업종: ${type}`

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1200,
    messages: [{
      role: 'user',
      content: `당신은 제주 관광업 SNS 바이럴 전문가입니다.

${baseInfo}
${customPrompt ? `\n요청사항: ${customPrompt}` : ''}

아래 형식으로 정확히 출력하세요. 다른 말 없이 이 형식만:

[주제목-라인1]
(영문 2~4단어, 대문자. 예: JEJU CAFE / OCEAN VIEW / JEJU PENSION)

[주제목-라인2]
(한국어 5~10자, 임팩트 있는 한 줄 훅. 예: 천국같은 에메랄드빛 오션뷰 카페)

[설명글-한국어]
(1~2문장, 가게 매력 설명 + 해시태그 3개. 해시태그는 줄 끝에)

[설명글-영어]
(1~2문장 + 3 hashtags)

[설명글-중국어]
(1~2句 + 3个话题标签)

[설명글-일본어]
(1~2文 + ハッシュタグ3個)`
    }]
  })
  return msg.content.map(c => c.text || '').join('')
}

// ── 캡션에서 섹션 추출 ──────────────────────────────────────────
export function extractSection(captionText, section) {
  if (!captionText) return ''
  const sectionMap = {
    titleLine1: '[주제목-라인1]',
    titleLine2: '[주제목-라인2]',
    ko:         '[설명글-한국어]',
    en:         '[설명글-영어]',
    zh:         '[설명글-중국어]',
    ja:         '[설명글-일본어]',
  }
  const header = sectionMap[section]
  if (!header) return ''
  const lines = captionText.split('\n')
  const headers = Object.values(sectionMap)
  let collecting = false
  const result = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === header) { collecting = true; continue }
    if (headers.includes(trimmed) && collecting) break
    if (collecting && trimmed && !trimmed.startsWith('#')) {
      result.push(trimmed.replace(/[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/g, '').trim())
    }
  }
  return result.join(' ').trim()
}

// ── AI 리뷰 답변 생성 ──────────────────────────────────────────
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
