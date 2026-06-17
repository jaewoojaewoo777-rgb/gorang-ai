import crypto from 'crypto'

const API_KEY = process.env.SOLAPI_API_KEY
const SECRET_KEY = process.env.SOLAPI_API_SECRET
const SENDER = process.env.SOLAPI_SENDER_NUMBER  // 발신번호 (솔라피 등록된 번호)
const PFID = process.env.SOLAPI_PFID              // 카카오 채널 PF ID

// 솔라피 HMAC-SHA256 인증 헤더
function makeAuthHeader() {
  const date = new Date().toISOString()
  const salt = crypto.randomBytes(16).toString('hex')
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(date + salt)
    .digest('hex')
  return `HMAC-SHA256 apiKey=${API_KEY}, date=${date}, salt=${salt}, signature=${signature}`
}

// 알림톡 발송 (템플릿 ID 기반)
async function sendAlimtalk({ to, templateCode, variables }) {
  const body = {
    message: {
      to,
      from: SENDER,
      kakaoOptions: {
        pfId: PFID,
        templateId: templateCode,
        variables,
      },
    },
  }

  const res = await fetch('https://api.solapi.com/messages/v4/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: makeAuthHeader(),
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(`솔라피 발송 실패: ${JSON.stringify(data)}`)
  }
  return data
}

// ── 악성리뷰 즉시 알림 ───────────────────────────
// 템플릿: gorang_bad_review_alert
// 변수: #{shop_name}, #{star}, #{summary}, #{reply1}, #{reply2}
export async function sendBadReviewAlert({ to, shopName, star, reviewerName, summary, reply1 }) {
  return sendAlimtalk({
    to,
    templateCode: process.env.SOLAPI_TEMPLATE_BAD_REVIEW,
    variables: {
      '#{업체명}': shopName,
      '#{별점}': String(star),
      '#{작성자}': reviewerName || '익명',
      '#{리뷰요약}': summary,
      '#{추천답변}': reply1,
    },
  })
}

// ── 일반 리뷰 알림 ──────────────────────────────
// 템플릿: gorang_review_alert
// 변수: #{shop_name}, #{star}, #{summary}
export async function sendReviewAlert({ to, shopName, star, reviewerName, summary, reply1 }) {
  return sendAlimtalk({
    to,
    templateCode: process.env.SOLAPI_TEMPLATE_REVIEW_ALERT,
    variables: {
      '#{업체명}': shopName,
      '#{별점}': String(star),
      '#{작성자}': reviewerName || '익명',
      '#{리뷰요약}': summary,
      '#{추천답변}': reply1 || '',
    },
  })
}

// ── 주간 리포트 알림 ────────────────────────────
// 템플릿: gorang_weekly_reminder
// 변수: #{업체명}, #{신규리뷰수}, #{업로드수}
export async function sendWeeklyReminder({ to, shopName, newReviews, uploadCount }) {
  return sendAlimtalk({
    to,
    templateCode: process.env.SOLAPI_TEMPLATE_WEEKLY,
    variables: {
      '#{업체명}': shopName,
      '#{신규리뷰수}': String(newReviews),
      '#{업로드수}': String(uploadCount),
    },
  })
}
