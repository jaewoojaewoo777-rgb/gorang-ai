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
  const res = await fetch('https://mybusiness.googleapis.com/v4/accounts', {
    headers: { Authorization: `Bearer ${authClient.credentials.access_token}` }
  })
  const data = await res.json()
  return data.accounts || []
}

export async function getGBPLocations(authClient, accountName) {
  const res = await fetch(`https://mybusiness.googleapis.com/v4/${accountName}/locations`, {
    headers: { Authorization: `Bearer ${authClient.credentials.access_token}` }
  })
  const data = await res.json()
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

// ── YouTube API ──────────────────────────────────

export async function uploadYouTubeVideo({ accessToken, title, description, videoBuffer, mimeType }) {
  const youtube = google.youtube('v3')
  const authClient = getOAuthClient()
  authClient.setCredentials({ access_token: accessToken })

  const { Readable } = await import('stream')
  const stream = Readable.from(videoBuffer)

  const res = await youtube.videos.insert({
    auth: authClient,
    part: ['snippet', 'status'],
    requestBody: {
      snippet: { title, description, categoryId: '19' }, // 19 = Travel & Events
      status: { privacyStatus: 'public', madeForKids: false },
    },
    media: { mimeType, body: stream },
  })

  return res.data
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
