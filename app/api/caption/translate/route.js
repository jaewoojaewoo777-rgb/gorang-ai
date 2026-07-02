import { NextResponse } from 'next/server'
import { translateCaptionShorts } from '../../../../lib/gemini'

export async function POST(req) {
  try {
    const { koText, targetLang } = await req.json()
    if (!koText || !targetLang) return NextResponse.json({ error: '파라미터 없음' }, { status: 400 })

    const translation = await translateCaptionShorts({ koText, targetLang })
    return NextResponse.json({ translation })
  } catch (err) {
    console.error('번역 오류:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
