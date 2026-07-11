const API_BASE = 'https://www.gorang-ai.com'
const NAVER_LOGIN_URL = 'https://nid.naver.com/nidlogin.login'
const SMARTPLACE_REVIEWS_URL = 'https://new.smartplace.naver.com/'

// 스마트플레이스 리뷰 페이지 URL에서 placeId(경로)와 bookingBusinessId(쿼리)를 뽑아낸다.
// 예: https://new.smartplace.naver.com/bizes/place/5176498/reviews?bookingBusinessId=1663323&menu=visitor
function parseSmartplaceUrl(url) {
  const placeMatch = url.match(/\/bizes\/place\/(\d+)/)
  const bookingMatch = url.match(/bookingBusinessId=(\d+)/)
  if (!placeMatch || !bookingMatch) return null
  return { placeId: placeMatch[1], bookingBusinessId: bookingMatch[1] }
}

const codeInput = document.getElementById('pairingCode')
const statusEl = document.getElementById('status')
const loginBtn = document.getElementById('loginBtn')
const connectBtn = document.getElementById('connectBtn')

function setStatus(message, kind) {
  statusEl.textContent = message
  statusEl.className = kind || ''
}

loginBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: NAVER_LOGIN_URL })
})

connectBtn.addEventListener('click', async () => {
  const pairingCode = codeInput.value.trim()
  if (!/^\d{6}$/.test(pairingCode)) {
    setStatus('연동코드 6자리를 정확히 입력해주세요.', 'error')
    return
  }

  connectBtn.disabled = true
  setStatus('네이버 로그인 상태 확인 중...')

  try {
    const cookies = await chrome.cookies.getAll({ domain: 'naver.com' })
    const hasSession = cookies.some((c) => c.name === 'NID_AUT' || c.name === 'NID_SES')

    if (!hasSession) {
      setStatus('네이버 로그인이 안 되어 있어요. "네이버 로그인 창 열기"로 먼저 로그인해주세요.', 'error')
      connectBtn.disabled = false
      return
    }

    // 현재 열려있는 탭 중 스마트플레이스 리뷰 페이지에서 placeId/bookingBusinessId를 가져온다
    const tabs = await chrome.tabs.query({ url: `${SMARTPLACE_REVIEWS_URL}*` })
    const parsed = tabs.map((t) => parseSmartplaceUrl(t.url)).find(Boolean)

    if (!parsed) {
      setStatus('먼저 스마트플레이스 "리뷰" 관리 페이지를 열어주세요 (new.smartplace.naver.com).', 'error')
      connectBtn.disabled = false
      return
    }

    setStatus('세션 전송 중...')

    const res = await fetch(`${API_BASE}/api/naver/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pairingCode,
        placeId: parsed.placeId,
        bookingBusinessId: parsed.bookingBusinessId,
        cookies: cookies.map((c) => ({
          name: c.name,
          value: c.value,
          domain: c.domain,
          path: c.path,
          secure: c.secure,
          expirationDate: c.expirationDate,
        })),
      }),
    })

    const data = await res.json()

    if (!res.ok || !data.success) {
      throw new Error(data.error || `요청 실패 (${res.status})`)
    }

    setStatus('연결 완료! 리뷰 자동 관리가 시작됩니다.', 'ok')
    chrome.storage.local.set({ lastConnectedAt: Date.now() })
  } catch (err) {
    setStatus(`연결 실패: ${err.message}`, 'error')
  } finally {
    connectBtn.disabled = false
  }
})
