export const maxDuration = 60

import { NextResponse } from 'next/server'
import { getSession } from '../../../../lib/session'

function splitText(text, count) {
  if (!text) return Array(count).fill('')
  if (count === 1) return [text.trim()]

  // 일본어/중국어(。！？)는 공백 없이도 분리, 한국어/영어(.!?)는 공백 필요
  const units = text
    .split(/(?<=[。！？])|(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean)

  const res = Array(count).fill('')
  if (units.length >= count) {
    const per = Math.ceil(units.length / count)
    for (let i = 0; i < count; i++)
      res[i] = units.slice(i * per, (i + 1) * per).join(' ').trim()
  } else {
    // 문장 수가 사진 수보다 적으면 앞쪽 슬롯에만 배분 (단어 파편화 방지)
    for (let i = 0; i < units.length; i++) res[i] = units[i]
  }
  return res
}

// 외국어 자막을 한국어 청크 위치에 맞춰 정렬
// 한국어가 비어있는 슬롯에는 외국어도 비움 → 내용이 항상 같은 사진에 표시됨
function alignSubToKo(subText, koChunks) {
  const n = koChunks.length
  const nonEmptyIdx = koChunks.map((t, i) => t.trim() ? i : -1).filter(i => i >= 0)
  const result = Array(n).fill('')
  if (!subText.trim() || nonEmptyIdx.length === 0) return result

  // 외국어를 ko 비어있지않은 슬롯 수만큼 분할
  const subParts = splitText(subText, nonEmptyIdx.length)
  nonEmptyIdx.forEach((pos, j) => { result[pos] = subParts[j] || '' })
  return result
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
      tone = null,      // 캡션 말투(trendy/emotional/cute/luxury/info) → 자막 폰트 자동 선택용
      titleFont = null, // 주제목 폰트 (UI에서 직접 선택, null이면 서버 기본값)
      mediaItems,       // [{ type:'photo'|'video', url }] — 사진+영상 혼합
    } = await request.json()

    // 혼합 모드: mediaItems가 있으면 사진만 골라 자막 매칭
    const hasMedia = Array.isArray(mediaItems) && mediaItems.length > 0

    if (!hasMedia && !imageDataUrls?.length)
      return NextResponse.json({ error: '이미지 없음' }, { status: 400 })

    // 자막은 '사진' 개수 기준으로 분배 (영상 구간은 자막 없음)
    const photoCount = hasMedia
      ? mediaItems.filter(m => m.type === 'photo').length
      : imageDataUrls.length
    const n = Math.max(1, photoCount)
    const koChunks  = splitText(koText, n)
    const subChunks = alignSubToKo(subText, koChunks)
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
        imageUrls: imageDataUrls || [],
        mediaItems: hasMedia ? mediaItems : null,
        bgmUrl: bgmUrl || null,
        captions: captionArray,
        orientation: isPortrait ? 'vertical' : 'horizontal',
        subLang,
        titleLine1: titleLine1 || '',
        titleLine2: titleLine2 || '',
        shopType: shopType || '',
        tone: tone || '',
        titleFont: titleFont || '',
      }),
    })

    if (!renderRes.ok) {
      const err = await renderRes.json().catch(() => ({ error: '렌더링 서버 오류' }))
      throw new Error(err.error || '렌더링 서버 오류')
    }

    const { jobId } = await renderRes.json()
    console.log('[video/generate] jobId:', jobId)

    // 렌더는 백그라운드로 진행 → jobId 즉시 반환.
    // 완료 폴링은 브라우저가 /api/video/status 로 직접 함 (Vercel 60초 제한 회피)
    return NextResponse.json({
      ok: true,
      jobId,
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
