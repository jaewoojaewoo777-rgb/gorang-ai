// 토스페이먼츠 빌링(정기결제) API 래퍼
// https://docs.tosspayments.com/guides/v2/billing/integration

const TOSS_API = 'https://api.tosspayments.com/v1'

export const PLAN_PRICES = {
  basic: { name: '베이직', amount: 29000 },
  standard: { name: '스탠다드', amount: 59000 },
  pro: { name: '프로', amount: 129000 },
}

function authHeader() {
  const secretKey = process.env.TOSS_SECRET_KEY || ''
  return 'Basic ' + Buffer.from(`${secretKey}:`).toString('base64')
}

async function tossFetch(path, body) {
  const res = await fetch(`${TOSS_API}${path}`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) {
    const err = new Error(data.message || '토스페이먼츠 요청 실패')
    err.code = data.code
    err.raw = data
    throw err
  }
  return data
}

// 카드 등록(빌링 인증) 완료 후 authKey로 빌링키 발급
export async function issueBillingKey(authKey, customerKey) {
  return tossFetch('/billing/authorizations/issue', { authKey, customerKey })
}

// 발급된 빌링키로 실제 결제 청구
export async function chargeBilling(billingKey, { customerKey, amount, orderId, orderName }) {
  return tossFetch(`/billing/${billingKey}`, { customerKey, amount, orderId, orderName })
}
