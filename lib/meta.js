const API_VER = 'v19.0'
const BASE = `https://graph.facebook.com/${API_VER}`

export function getMetaAuthUrl(state) {
  const scopes = [
    'instagram_basic',
    'instagram_content_publish',
    'pages_show_list',
    'pages_manage_posts',
    'pages_read_engagement',
    'public_profile',
  ].join(',')
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID,
    redirect_uri: process.env.META_REDIRECT_URI,
    scope: scopes,
    response_type: 'code',
    state,
  })
  return `https://www.facebook.com/${API_VER}/dialog/oauth?${params}`
}

export async function exchangeMetaCode(code) {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID,
    client_secret: process.env.META_APP_SECRET,
    redirect_uri: process.env.META_REDIRECT_URI,
    code,
  })
  const res = await fetch(`${BASE}/oauth/access_token?${params}`)
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data
}

export async function getLongLivedToken(shortToken) {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: process.env.META_APP_ID,
    client_secret: process.env.META_APP_SECRET,
    fb_exchange_token: shortToken,
  })
  const res = await fetch(`${BASE}/oauth/access_token?${params}`)
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data // { access_token, token_type, expires_in }
}

// FB 페이지 목록 + 연결된 IG 계정 ID 함께 반환
export async function getMetaPages(userToken) {
  const res = await fetch(
    `${BASE}/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${userToken}`
  )
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data.data || []
}

// Instagram Reels 업로드 (컨테이너 생성 → 처리 대기 → 게시)
export async function uploadInstagramReels({ igUserId, videoUrl, caption, userToken }) {
  // 1단계: 미디어 컨테이너 생성
  const containerRes = await fetch(`${BASE}/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      video_url: videoUrl,
      media_type: 'REELS',
      caption,
      access_token: userToken,
    }),
  })
  const containerData = await containerRes.json()
  if (containerData.error) throw new Error(`IG 컨테이너 생성 실패: ${containerData.error.message}`)
  const containerId = containerData.id

  // 2단계: 처리 대기 (최대 50초, 5초 간격 10회)
  let statusCode = 'IN_PROGRESS'
  for (let i = 0; i < 10 && statusCode === 'IN_PROGRESS'; i++) {
    await new Promise(r => setTimeout(r, 5000))
    const checkRes = await fetch(`${BASE}/${containerId}?fields=status_code&access_token=${userToken}`)
    const checkData = await checkRes.json()
    statusCode = checkData.status_code || 'IN_PROGRESS'
  }
  if (statusCode === 'ERROR') throw new Error('Instagram 미디어 처리 실패')
  if (statusCode !== 'FINISHED') throw new Error(`처리 시간 초과 (현재: ${statusCode}). 잠시 후 다시 시도하세요.`)

  // 3단계: 게시
  const publishRes = await fetch(`${BASE}/${igUserId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: containerId, access_token: userToken }),
  })
  const publishData = await publishRes.json()
  if (publishData.error) throw new Error(`IG 게시 실패: ${publishData.error.message}`)
  return publishData.id
}

// Facebook 페이지 동영상 업로드 (URL 방식 — Facebook이 직접 fetch)
export async function uploadFacebookVideo({ pageId, pageAccessToken, videoUrl, description, title }) {
  const res = await fetch(`${BASE}/${pageId}/videos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      file_url: videoUrl,
      description: description || '',
      title: (title || description || '').slice(0, 100),
      access_token: pageAccessToken,
    }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data.id
}
