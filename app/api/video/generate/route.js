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
        const res = Array(count).fill('')
        const per = Math.ceil(sentences.length / count)
        for (let i = 0; i < count; i++)
          res[i] = sentences.slice(i * per, (i + 1) * per).join(' ').trim()
        return res
      }
      const words = text.split(/\s+/).filter(Boolean)
      const res = Array(count).fill('')
      const per = Math.ceil(words.length / count)
      for (let i = 0; i < count; i++)
        res[i] = words.slice(i * per, (i + 1) * per).join(' ').trim()
      return res
    }

    // 자막 배열 구성
    const koChunks  = splitText(koText, n)
    const subChunks = splitText(subText, n)
    const captionArray = captions || koChunks.map((ko, i) => ({
      ko,
      sub: subChunks[i] || '',
    }))

    // Railway 서버로 요청
    const railwayUrl = process.env.RAILWAY_VIDEO_SERVER_URL
    if (!railwayUrl) throw new Error('RAILWAY_VIDEO_SERVER_URL 환경변수 없음')

    const response = await fetch(`${railwayUrl}/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrls: imageDataUrls, // base64 → URL로 변환 필요 (아래 참고)
        bgmUrl: null,             // BGM은 다음 단계에서 연결
        captions: captionArray,
        orientation: isPortrait ? 'vertical' : 'horizontal',
        subLang,
        titleLine1: titleLine1 || '',
        titleLine2: titleLine2 || '',
      }),
      signal: AbortSignal.timeout(120000), // 2분 타임아웃
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error || '렌더링 서버 오류')
    }

    const result = await response.json()

    return NextResponse.json({
      ok: true,
      videoUrl: result.videoUrl,
      duration: n * 3,
    })

  } catch (err) {
    console.error('[video/generate]', err)
    return NextResponse.json({
      ok: false,
      error: err.message || '영상 생성 실패',
    }, { status: 500 })
  }
}
