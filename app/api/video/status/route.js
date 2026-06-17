  // app/api/video/status/route.js
// 브라우저가 렌더링 완료 여부를 폴링하는 엔드포인트.
// Railway의 /status/{jobId} 를 대신 호출해 결과만 돌려줌 (Railway URL은 서버에만 노출).
import { NextResponse } from 'next/server'
import { getSession } from '../../../../lib/session'

export const maxDuration = 30

export async function GET(request) {
  const session = await getSession()
  if (!session.userId) {
    return NextResponse.json({ error: '로그인 필요' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const jobId = searchParams.get('jobId')
  if (!jobId) {
    return NextResponse.json({ error: 'jobId 없음' }, { status: 400 })
  }

  const railwayUrl = process.env.RAILWAY_VIDEO_SERVER_URL
  if (!railwayUrl) {
    return NextResponse.json({ status: 'error', error: 'RAILWAY_VIDEO_SERVER_URL 환경변수 없음' }, { status: 500 })
  }

  try {
    const res = await fetch(`${railwayUrl}/status/${jobId}`)
    const data = await res.json()
    // data = { status: 'processing' | 'done' | 'error', videoUrl, error }
    return NextResponse.json(data)
  } catch (e) {
    // 일시적 오류 → 브라우저가 다음 폴링에서 재시도하도록 processing 으로 응답
    return NextResponse.json({ status: 'processing', note: e.message || '상태 조회 일시 오류' })
  }
}
