// lib/tiktok.js — TikTok Login Kit + Content Posting API
// (lib/google.js 와 같은 역할의 틱톡 버전)

const TIKTOK_SCOPES = 'user.info.basic,video.publish'

function getRedirectUri() {
  return (
    process.env.TIKTOK_REDIRECT_URI ||
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/tiktok/callback`
  )
}

// 1. 인증 URL 생성 (Login Kit)
export function getTikTokAuthUrl(state) {
  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY,
    scope: TIKTOK_SCOPES,
    response_type: 'code',
    redirect_uri: getRedirectUri(),
    state: state || 'gorang',
  })
  return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`
}

// 2. code → 토큰 교환
export async function exchangeTikTokCode(code) {
  const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY,
      client_secret: process.env.TIKTOK_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: getRedirectUri(),
    }).toString(),
  })
  const data = await res.json()
  if (data.error) {
    throw new Error(`토큰 교환 실패: ${data.error_description || data.error}`)
  }
  return data // { access_token, refresh_token, open_id, expires_in, scope, ... }
}

// 3. 토큰 갱신 (액세스 토큰 24시간 만료)
export async function refreshTikTokToken(refreshToken) {
  const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY,
      client_secret: process.env.TIKTOK_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).toString(),
  })
  const data = await res.json()
  if (data.error) {
    throw new Error(`토큰 갱신 실패: ${data.error_description || data.error}`)
  }
  return data
}

// 4. 사용자 정보 (display_name, avatar)
export async function getTikTokUserInfo(accessToken) {
  const res = await fetch(
    'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const data = await res.json()
  return data?.data?.user || {}
}

// 5. 크리에이터 정보 조회 (Direct Post 전 필수)
export async function queryCreatorInfo(accessToken) {
  const res = await fetch(
    'https://open.tiktokapis.com/v2/post/publish/creator_info/query/',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
    }
  )
  const data = await res.json()
  return data?.data || {}
}

// 6. 영상 업로드 (Direct Post · FILE_UPLOAD · 단일 청크)
//    심사 전이라 privacy_level 은 SELF_ONLY(비공개) 고정
export async function uploadTikTokVideo({ accessToken, caption, videoBuffer }) {
  const videoSize = videoBuffer.length

  // (a) 업로드 초기화
  const initRes = await fetch(
    'https://open.tiktokapis.com/v2/post/publish/video/init/',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({
        post_info: {
          title: (caption || '고랑AI').slice(0, 2000),
          privacy_level: 'SELF_ONLY',
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
          video_cover_timestamp_ms: 1000,
        },
        source_info: {
          source: 'FILE_UPLOAD',
          video_size: videoSize,
          chunk_size: videoSize,
          total_chunk_count: 1,
        },
      }),
    }
  )
  const initData = await initRes.json()
  if (!initData.data || !initData.data.upload_url) {
    throw new Error(
      `업로드 초기화 실패: ${initData.error?.message || JSON.stringify(initData)}`
    )
  }
  const { publish_id, upload_url } = initData.data

  // (b) 영상 바이트 전송 (PUT)
  const putRes = await fetch(upload_url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': String(videoSize),
      'Content-Range': `bytes 0-${videoSize - 1}/${videoSize}`,
    },
    body: videoBuffer,
  })
  if (putRes.status !== 200 && putRes.status !== 201) {
    const t = await putRes.text()
    throw new Error(`영상 전송 실패 (${putRes.status}): ${t}`)
  }

  return { publish_id }
}

// 7. 게시 상태 확인
export async function getTikTokPostStatus(accessToken, publishId) {
  const res = await fetch(
    'https://open.tiktokapis.com/v2/post/publish/status/fetch/',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({ publish_id: publishId }),
    }
  )
  const data = await res.json()
  return data?.data || {}
}
