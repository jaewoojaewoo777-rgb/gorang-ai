import Anthropic from '@anthropic-ai/sdk'
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// gemini-2.5-flash가 수요 급증(503)일 때 flash-lite로 대체
const MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite']
const LANG_NAME = { en: '영어', zh: '중국어 간체', ja: '일본어' }

async function callGemini(model, prompt) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  )
  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error(data?.error?.message || 'Gemini 번역 실패')
  return text.trim()
}

// 한국어 SNS 캡션을 대상 언어로 번역 + 쇼츠/릴스 자막에 맞게 다듬기
export async function translateCaptionShorts({ koText, targetLang }) {
  const langName = LANG_NAME[targetLang] || '영어'

  const prompt = `아래 한국어 SNS 캡션을 ${langName}로 번역해줘. 직역이 아니라 쇼츠·릴스 자막용으로 다듬어서:
- 문장을 짧게 끊어서 자막으로 읽기 좋게 (한 문장이 너무 길지 않게)
- 해시태그는 유지하되 ${langName}권 SNS에서 실제 쓰는 자연스러운 표현으로
- ${langName} 특유의 트렌디한 SNS 톤으로, 과하지 않게
- 다른 설명 없이 번역문만 출력

${koText}`

  let lastErr
  for (const model of MODELS) {
    // 순간적인 503(high demand)은 모델 하나당 2번까지 짧게 재시도
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        return await callGemini(model, prompt)
      } catch (e) {
        lastErr = e
        console.error(`Gemini(${model}) 시도 ${attempt} 실패:`, e.message)
        if (attempt < 2) await new Promise(r => setTimeout(r, 1500))
      }
    }
  }

  // Gemini가 전부 과부하일 때만 Claude로 조용히 폴백 (평소엔 안 탐)
  console.error('Gemini 전체 실패, Claude로 폴백:', lastErr.message)
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  })
  return msg.content[0].text.trim()
}
