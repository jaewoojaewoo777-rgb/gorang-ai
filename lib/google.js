import { google } from 'googleapis'

const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/business.manage',
]

export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )
}

export function getAuthUrl() {
  const client = getOAuthClient()
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  })
}

export function getClientWithTokens(accessToken, refreshToken) {
  const client = getOAuthClient()
  client.setCredentials({ access_token: accessToken, refresh_token: refreshToken })
  return client
}

// ── 구글 비즈니스 프로필 API ──────────────────────
export async function getGBPAccounts(authClient) {
  const res = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
    headers: { Authorization: `Bearer ${authClient.credentials.access_token}` }
  })
  const data = await res.json()
  console.log('GBP accounts 응답:', JSON.stringify(data))
  return data.accounts || []
}

export async function getGBPLocations(authClient, accountName) {
  const res = await fetch(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title`,
    { headers: { Authorization: `Bearer ${authClient.credentials.access_token}` } }
  )
  const data = await res.json()
  console.log('GBP locations 응답:', JSON.stringify(data))
  return data.locations || []
}

export async function getGBPReviews(accessToken, accountId, locationId) {
  const url = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews?pageSize=20`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  const data = await res.json()
  return data.reviews || []
}

export async function postGBPReply(accessToken, accountId, locationId, reviewId, replyText) {
  const url = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews/${reviewId}/reply`
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ comment: replyText }),
  })
  return res.json()
}

// ── YouTube API (Resumable Upload) ──────────────
// multipart 업로드는 대용량 파일에서 YouTube로부터 413 반환 → resumable 로 변경
export async function uploadYouTubeVideo({ accessToken, title, description, videoBuffer, videoUrl, mimeType, isShorts }) {
  const finalTitle = isShorts && !title.includes('#Shorts')
    ? `${title} #Shorts`
    : title

  const metadata = {
    snippet: {
      title: finalTitle,
      description: description || '',
      categoryId: '19',
      tags: isShorts ? ['Shorts', '제주', '카페', '펜션'] : ['제주', '카페', '펜션'],
    },
    status: { privacyStatus: 'public', madeForKids: false },
  }

  // Step 1: resumable upload 세션 초기화
  const initRes = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': mimeType || 'video/mp4',
      },
      body: JSON.stringify(metadata),
    }
  )
  if (!initRes.ok) {
    const txt = await initRes.text()
    throw new Error(`YouTube 세션 초기화 실패: ${initRes.status} ${txt}`)
  }
  const uploadUrl = initRes.headers.get('location')
  if (!uploadUrl) throw new Error('YouTube 업로드 URL 없음')

  // Step 2: 영상 스트리밍 업로드 (URL이 있으면 서버-to-서버 스트림, 아니면 버퍼)
  let uploadBody, contentLength
  if (videoUrl) {
    const srcRes = await fetch(videoUrl)
    if (!srcRes.ok) throw new Error(`영상 다운로드 실패: ${srcRes.status}`)
    contentLength = srcRes.headers.get('content-length')
    uploadBody = srcRes.body   // ReadableStream → 메모리 버퍼링 없이 직접 전달
  } else {
    contentLength = String(videoBuffer.byteLength)
    uploadBody = videoBuffer
  }

  const uploadHeaders = { 'Content-Type': mimeType || 'video/mp4' }
  if (contentLength) uploadHeaders['Content-Length'] = contentLength

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: uploadHeaders,
    body: uploadBody,
    duplex: 'half',   // Node.js 18+ 스트리밍 요청 필수
  })
  if (!uploadRes.ok) {
    const txt = await uploadRes.text()
    throw new Error(`YouTube 업로드 실패: ${uploadRes.status} ${txt}`)
  }
  return await uploadRes.json()
}

// ── 토큰 갱신 ──────────────────────────────────
export async function refreshAccessToken(refreshToken) {
  const client = getOAuthClient()
  client.setCredentials({ refresh_token: refreshToken })
  const { credentials } = await client.refreshAccessToken()
  return credentials
}

// ── 언어 감지 (리뷰 언어 판단) ──────────────────
export function detectLanguage(text) {
  if (!text) return 'ko'
  const chinesePattern = /[\u4e00-\u9fff]/
  const japanesePattern = /[\u3040-\u309f\u30a0-\u30ff]/
  const koreanPattern = /[\uac00-\ud7af]/
  if (chinesePattern.test(text)) return 'zh'
  if (japanesePattern.test(text)) return 'ja'
  if (koreanPattern.test(text)) return 'ko'
  return 'en'
}
