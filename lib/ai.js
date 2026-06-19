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
export async function generateCaption({ shopName, shopLocation, shopType, customPrompt, subLang = 'en', imageBase64List = [], tone = 'trendy' }) {
  const typeLabel = shopTypeLabel(shopType)
  const baseInfo = `가게 정보:\n- 이름: ${shopName}\n- 위치: ${shopLocation || '제주도'}\n- 업종: ${typeLabel}`

  const langMap = { en: '영어', zh: '중국어', ja: '일본어' }
  const langName = langMap[subLang] || '영어'

  // 말투(tone) 가이드
  const toneGuide = {
    trendy: 'MZ세대가 쓰는 트렌디한 SNS 감성. 짧고 감각적으로. "~할 결심", "여기 미쳤다", "찐이에요", "인생샷 각" 같은 요즘 표현 자연스럽게. 너무 격식 차리지 말고 친구한테 말하듯.',
    emotional: '잔잔하고 감성적인 무드. 따뜻하고 서정적인 표현. "오늘 같은 날", "문득", "조용히 머물고 싶은" 같은 감성 어휘. 차분하게.',
    cute: '귀엽고 발랄한 말투. 이모지 적극 활용. "너무 좋아💕", "여기 완전 취향저격🥺", "또 가고 싶다ㅠㅠ" 같은 친근하고 사랑스러운 표현.',
    luxury: '고급스럽고 세련된 말투. 프리미엄 감성. "오직 당신을 위한", "특별한 하루", "잊지 못할 순간" 같은 품격 있는 표현. 군더더기 없이.',
    info: '깔끔하고 정보 전달 위주. 과장 없이 핵심만. 메뉴/위치/특징을 명확하게.',
  }
  const toneText = toneGuide[tone] || toneGuide.trendy

  const textPrompt = `당신은 제주 관광업 SNS 바이럴 전문가입니다. 인스타 릴스/틱톡/유튜브 쇼츠에서 실제로 터지는 캡션을 씁니다.

${baseInfo}

[말투 지침] ${toneText}
${customPrompt ? `\n[추가 요청] ${customPrompt}` : ''}
${imageBase64List.length > 0 ? '\n[중요] 첨부된 사진을 분석해서 실제 찍힌 것(메뉴, 인테리어, 풍경, 분위기 등)을 캡션에 반드시 반영하세요. 사진에 없는 내용(예: 바다, 오션뷰)은 절대 쓰지 마세요.' : ''}

[작성 규칙]
- 딱딱한 설명체 금지. 위 말투 지침대로 SNS에서 실제로 쓰는 생생한 말투로.
- 특수문자(—, ─, |, ▌ 등) 절대 사용 금지. 문장은 자연스러운 문장부호(. ! ?)로만 끝내기.
- 설명글은 자막으로 들어가므로 한 문장이 너무 길지 않게.
- 주제목 라인1은 영문 소문자, 라인2는 한국어로 작성.

아래 형식으로 정확히 출력하세요. 다른 말 없이 이 형식만:

[주제목-라인1]
(영문 소문자 2~4단어. 예: jeju morning / mango cafe)

[주제목-라인2]
(한국어 5~12자, 스크롤 멈추게 하는 훅. 예: 망고가 미쳤다 진짜)

[설명글-한국어]
(한국어 2~3개의 짧은 문장 + 해시태그 3개. 위 말투대로, 사진에 실제 보이는 것 기반)

[설명글-${langName}]
(${langName} 2~3개의 짧은 문장 + 해시태그 3개. 반드시 ${langName}로만 작성, 다른 언어 절대 섞지 말 것)`

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
