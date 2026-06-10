import { NextResponse } from 'next/server'
import { getSession } from '../../../../lib/session'

export async function POST(request) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  try {
    const {
      imageDataUrls,
      koText,
      subText,
      titleLine1,
      titleLine2,
      isPortrait,
      subLang = 'none',
      captions,
    } = await request.json()

    if (!imageDataUrls?.length)
      return NextResponse.json({ error: '이미지 없음' }, { status: 400 })

    const n = imageDataUrls.length

    // 자막 분할 함수
    function splitText(text, count) {
      if (!text) return Array(count).fill('')
      if (count === 1) return [text.trim()]
      const sentences = text.split(/(?<=[.!?。！？])\s+/).map(s => s.trim()).filter(Boolean)
      if (sentences.length >= count) {
        const re
