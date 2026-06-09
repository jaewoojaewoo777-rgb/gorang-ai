import Anthropic from '@anthropic-ai/sdk'
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── AI 캡션 생성 (주제목 + 설명글 + 외국어 분리) ──────────────────────
export async function generateCaption({ shopName, shopLocation, shopType, customPrompt }) {
  const type = shopType === 'cafe' ? '카페' : '펜션/숙박'
  const baseInfo = `가게 정보:\n- 이름: ${shopName}\n- 위치: ${shopLocation || '제주도'}\n- 업종: ${type}`

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1200,
    messages: [{
      role: 'user',
      content: `당신은 제주 관광업 SNS 바이럴 전문가입니다.
수백만 조회수를 기록한 제주 카페/펜션 릴스를 분석한 결과,
화면 중앙의 주제목과 하단 설명글이 핵심입니다.

${baseInfo}
${customPrompt ? `\n요청사항: ${customPrompt}` : ''}

아래 훅 패턴 중 이 가게에 가장 잘 맞는 것을 골라 주제목에 적용하세요:
- 비주얼 임팩트 ("한 폭의 그림 같은", "뷰 미쳤다", "천국같은")
- 독특한 경험 ("돌고래가 보이는", "비행기가 지나가는")
- 감탄형 ("실존한다니", "이런 곳이 있었어?")
- 희소성 ("오픈런 필수", "곧 없어질지도")

아래 형식으로 정확히 출력하세요. 다른 말 없이 이 형식만:

[주제목]
(한국어 2~5단어, 임팩트 있는 한 줄. 예: "천국같은 에메랄드빛 오션뷰 카페")

[설명글-한국어]
(1~2문장, 가게 매력 설명 + 해시태그 3개)

[설명글-영어]
(1~2문장 + 해시태그 3개)

[설명글-중국어]
(1~2문장 + 해시태그 3개)

[설명글-일본어]
(1~2문장 + 해시태그 3개)`
    }]
  })
  return msg.content.map(c => c.text || '').join('')
}

// ── 캡션에서 섹션 추출 ──────────────────────────
export function extractSection(captionText, section) {
  if (!captionText) return ''
  const sectionMap = {
    title:    '[주제목]',
    ko:       '[설명글-한국어]',
    en:       '[설명글-영어]',
    zh:       '[설명글-중국어]',
    ja:       '[설명글-일본어]',
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
    if (collecting && trimmed && !trimmed.startsWith('#') && trimmed !== '') {
      result.push(trimmed.replace(/[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/g, '').trim())
    }
  }
  return result.join(' ').trim()
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
