export const maxDuration = 60

import { NextResponse } from 'next/server'
import { getSession } from '../../../../lib/session'

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

// Railway 작업 완료될 때까지 폴링
async function waitForJob(railwayUrl, jobId, maxWaitMs = 55000) {
  const start = Date.now()
  while (Date.now() - start < maxWaitMs) {
    await new Promise(r => setTimeout(r, 2000)) // 2초 대기
    const res = await fetch(`${railwayUrl}/status/${jobId}`)
    const data = await res.json()
    console.log(`[폴링] jobId=${jobId} status=${data.status}`)
    if (data.status === 'done') return data.videoUrl
    if (data.status === 'error') throw new Error(data.error || '렌더링 실패')
  }
  throw new Error('렌더링 타임아웃 (55초 초과)')
}

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
      bgmUrl,
      isPortrait,
      subLang = 'none',
      captions,
      shopType = null,
    } = await request.json()

    if (!imageDataUrls?.length)
      return NextResponse.json({ error: '이미지 없음' }, { status: 400 })

    const n = imageDataUrls.length
    const koChunks  = splitText(koText, n)
    const subChunks = splitText(subText, n)
    const captionArray = captions || koChunks.map((ko, i) => ({
      ko,
      sub: subChunks[i] || '',
    }))

    const railwayUrl = process.env.RAILWAY_VIDEO_SERVER_URL
    if (!railwayUrl) throw new Error('RAILWAY_VIDEO_SERVER_URL 환경변수 없음')

    // 1. Railway에 렌더링 요청 (즉시 jobId 반환)
    const renderRes = await fetch(`${railwayUrl}/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrls: imageDataUrls,
        bgmUrl: bgmUrl || null,
        captions: captionArray,
        orientation: isPortrait ? 'vertical' : 'horizontal',
        subLang,
        titleLine1: titleLine1 || '',
        titleLine2: titleLine2 || '',
        shopType: shopType || '',
      }),
    })

    if (!renderRes.ok) {
      const err = await renderRes.json().catch(() => ({ error: '렌더링 서버 오류' }))
      throw new Error(err.error || '렌더링 서버 오류')
    }

    const { jobId } = await renderRes.json()
    console.log('[video/generate] jobId:', jobId)

    // 2. 완료될 때까지 폴링
    const videoUrl = await waitForJob(railwayUrl, jobId)

    return NextResponse.json({
      ok: true,
      videoUrl,
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
