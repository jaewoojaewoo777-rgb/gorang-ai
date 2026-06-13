import Anthropic from '@anthropic-ai/sdk'
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// 업종 한국어 변환
function shopTypeLabel(shopType) {
  if (!shopType) return '소상공인 업체'
  if (shopType.startsWith('other:')) return shopType.replace('other:', '')
  const map = {
    cafe: '카페',
    pension: '펜션·숙박',
    restaurant: '맛집·식당',
    fishing: '낚시·체험',
  }
  return map[shopType] || shopType
}

// ── AI 캡션 생성 (이미지 분석 포함) ────────────────────────────
export async function generateCaption({ shopName, shopLocation, shopType, customPrompt, subLang = 'en', imageBase64List = [] }) {
  const typeLabel = shopTypeLabel(shopType)
  const baseInfo = `가게 정보:\n- 이름: ${shopName}\n- 위치: ${shopLocation || '제주도'}\n- 업종: ${typeLabel}`

  const langMap = { en: '영어', zh: '중국어', ja: '일본어' }
  const langName = langMap[subLang] || '영어'

  const textPrompt = `당신은 제주 관광업 SNS 바이럴 전문가입니다.

${baseInfo}
${customPrompt ? `\n요청사항: ${customPrompt}` : ''}
${imageBase64List.length > 0 ? '\n첨부된 사진을 분석해서 실제 찍힌 것(메뉴, 인테리어, 풍경, 분위기 등)을 캡션에 반드시 반영하세요. 사진에 없는 내용(예: 바다, 오션뷰)은 절대 쓰지 마세요.' : ''}

아래 형식으로 정확히 출력하세요. 다른 말 없이 이 형식만:

[주제목-라인1]
(영문 2~4단어, 대문자. 예: MANGO CAFE / JEJU BRUNCH)

[주제목-라인2]
(한국어 5~10자, 임팩트 있는 훅. 예: 망고가 가득한 제주 감성 카페)

[설명글-한국어]
(한국어 1~2문장 + 해시태그 3개. 사진에 실제 보이는 것 기반으로)

[설명글-${langName}]
(${langName} 1~2문장 + 해시태그 3개. 반드시 ${langName}로만 작성, 다른 언어 절대 섞지 말 것)`

  // 이미지가 있으면 vision 포함, 없으면 텍스트만
  let content
  if (imageBase64List.length > 0) {
    // 최대 3장까지만 (토큰 절약)
    const imgBlocks = imageBase64List.slice(0, 3).map(b64 => ({
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/jpeg',
        data: b64,
      },
    }))
    content = [...imgBlocks, { type: 'text', text: textPrompt }]
  } else {
    content = textPrompt
  }

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    messages: [{ role: 'user', content }],
  })
  return msg.content.map(c => c.text || '').join('')
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
