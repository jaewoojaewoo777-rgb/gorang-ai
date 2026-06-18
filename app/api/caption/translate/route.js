import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const LANG_MAP = { en: '영어', zh: '중국어 간체', ja: '일본어' }

export async function POST(req) {
  try {
    const { koText, targetLang } = await req.json()
    if (!koText || !targetLang) return NextResponse.json({ error: '파라미터 없음' }, { status: 400 })

    const langName = LANG_MAP[targetLang] || '영어'

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `아래 한국어 SNS 캡션을 ${langName}로 자연스럽게 번역해줘. 해시태그는 유지하고 번역문만 출력해 (다른 설명 없이).

${koText}`,
      }],
    })

    const translation = response.content[0].text.trim()
    return NextResponse.json({ translation })
  } catch (err) {
    console.error('번역 오류:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
