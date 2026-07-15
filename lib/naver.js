// 네이버 플레이스는 공식 리뷰 API를 제공하지 않아서,
// 사장님이 직접 로그인해 캡처한 세션쿠키로 gorang-naver-worker(Railway, Playwright)를
// 통해 스크래핑/답변게시를 대신 수행한다. 이 파일은 그 워커를 호출하는 얇은 wrapper.

// Vercel 환경변수에 잘못된 값이 들어가 있어도(또는 아예 없어도) 서비스가 죽지
// 않도록 코드에 실제 Railway 워커 주소를 기본값으로 박아둠. 워커 주소가 바뀌면
// 여기도 같이 수정할 것.
export const DEFAULT_WORKER_URL = 'https://gorang-naver-worker-production-a079.up.railway.app'

function workerUrl(path) {
  const base = process.env.NAVER_WORKER_URL || DEFAULT_WORKER_URL
  return `${base.replace(/\/$/, '')}${path}`
}

// Vercel 함수 제한(55초) 안에 워커가 응답 안 하면(배포 직후 컨테이너 스왑 중 요청이
// 걸려서 응답도 에러도 안 오는 경우 등) fetch가 그냥 무한정 걸려있다가 Vercel 자체
// 타임아웃으로 조용히 죽어서 우리 catch/로그를 아예 못 타는 문제가 있었음 → 명시적
// 타임아웃으로 끊어서 최소한 원인 파악 가능한 에러 로그는 남게 함.
const WORKER_TIMEOUT_MS = 50000

async function callWorker(path, body) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), WORKER_TIMEOUT_MS)

  let res
  try {
    res = await fetch(workerUrl(path), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.NAVER_WORKER_SECRET}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (e) {
    if (e.name === 'AbortError') {
      throw new Error(`네이버 워커 응답 없음 (${WORKER_TIMEOUT_MS / 1000}초 타임아웃 — 배포 직후 컨테이너 재시작 중일 수 있음)`)
    }
    throw new Error(`네이버 워커 연결 실패: ${e.message}`)
  } finally {
    clearTimeout(timer)
  }

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

// 플레이스 리뷰 목록 조회. knownCount(이 가게의 DB에 이미 저장된 네이버 리뷰 수)를
// 넘겨주면, 워커가 그만큼 건너뛰고 그 다음 구간을 긁어와 매번 같은 최신 리뷰만
// 반복해서 보는 걸 피한다 (2026-07-15 "더보기 안 됨" 버그 수정).
export async function getNaverReviews(cookies, placeId, bookingBusinessId, knownCount = 0) {
  const data = await callWorker('/reviews', { cookies, placeId, bookingBusinessId, knownCount })
  return data.reviews || []
}

// 리뷰에 답변 게시
export async function postNaverReply(cookies, placeId, bookingBusinessId, reviewId, replyText) {
  return callWorker('/reply', { cookies, placeId, bookingBusinessId, reviewId, replyText })
}
