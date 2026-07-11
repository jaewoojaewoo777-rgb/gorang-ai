// 네이버 플레이스는 공식 리뷰 API를 제공하지 않아서,
// 사장님이 직접 로그인해 캡처한 세션쿠키로 gorang-naver-worker(Railway, Playwright)를
// 통해 스크래핑/답변게시를 대신 수행한다. 이 파일은 그 워커를 호출하는 얇은 wrapper.

function workerUrl(path) {
  const base = process.env.NAVER_WORKER_URL
  if (!base) throw new Error('NAVER_WORKER_URL 환경변수가 설정되지 않았습니다')
  return `${base.replace(/\/$/, '')}${path}`
}

async function callWorker(path, body) {
  const res = await fetch(workerUrl(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.NAVER_WORKER_SECRET}`,
    },
    body: JSON.stringify(body),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || `네이버 워커 오류 (${res.status})`)
  }
  return data
}

// 세션쿠키가 유효한지 확인. placeId/bookingBusinessId는 확장이 사장님의 스마트플레이스
// 리뷰 페이지 탭 URL에서 직접 파싱해 전달한다 (자동 탐색 안 함 — URL에 두 ID가 같이 있어야 함).
export async function verifyNaverSession(cookies, placeId, bookingBusinessId) {
  return callWorker('/verify', { cookies, placeId, bookingBusinessId })
}

// 플레이스 리뷰 목록 조회
export async function getNaverReviews(cookies, placeId, bookingBusinessId) {
  const data = await callWorker('/reviews', { cookies, placeId, bookingBusinessId })
  return data.reviews || []
}

// 리뷰에 답변 게시
export async function postNaverReply(cookies, placeId, bookingBusinessId, reviewId, replyText) {
  return callWorker('/reply', { cookies, placeId, bookingBusinessId, reviewId, replyText })
}
