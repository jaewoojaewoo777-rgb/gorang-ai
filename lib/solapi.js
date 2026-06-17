import crypto from 'crypto'

const API_KEY = process.env.SOLAPI_API_KEY
const SECRET_KEY = process.env.SOLAPI_SECRET_KEY
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

// 알림톡 발송 (템플릿 코드 기반)
async function sendAlimtalk({ to, templateCode, variables }) {
  const body = {
    message: {
      to,
      from: SENDER,
      kakaoOptions: {
        pfId: PFID,
        templateCode,
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
export async function sendBadReviewAlert({ to, shopName, star, summary, reply1, reply2 }) {
  return sendAlimtalk({
    to,
    templateCode: process.env.SOLAPI_TEMPLATE_BAD_REVIEW,
    variables: {
      '#{shop_name}': shopName,
      '#{star}': String(star),
      '#{summary}': summary,
      '#{reply1}': reply1,
      '#{reply2}': reply2 || reply1,
    },
  })
}

// ── 일반 리뷰 알림 ──────────────────────────────
// 템플릿: gorang_review_alert
// 변수: #{shop_name}, #{star}, #{summary}
export async function sendReviewAlert({ to, shopName, star, summary }) {
  return sendAlimtalk({
    to,
    templateCode: process.env.SOLAPI_TEMPLATE_REVIEW_ALERT,
    variables: {
      '#{shop_name}': shopName,
      '#{star}': String(star),
      '#{summary}': summary,
    },
  })
}

// ── 주간 리포트 알림 ────────────────────────────
// 템플릿: gorang_weekly_reminder
// 변수: #{shop_name}, #{total}, #{bad_count}
export async function sendWeeklyReminder({ to, shopName, total, badCount }) {
  return sendAlimtalk({
    to,
    templateCode: process.env.SOLAPI_TEMPLATE_WEEKLY,
    variables: {
      '#{shop_name}': shopName,
      '#{total}': String(total),
      '#{bad_count}': String(badCount),
    },
  })
}
