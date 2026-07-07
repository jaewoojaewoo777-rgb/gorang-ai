import { NextResponse } from 'next/server'
import { getSession } from '../../../../../lib/session'
import { supabaseAdmin } from '../../../../../lib/db'
import { issueBillingKey, chargeBilling, PLAN_PRICES } from '../../../../../lib/toss'

// 토스페이먼츠 카드 등록(빌링 인증) 성공 후 리다이렉트되는 콜백
// 쿼리: plan, authKey, customerKey (customerKey는 우리가 생성해 넘긴 값 그대로 돌아옴)
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const plan = searchParams.get('plan')
  const authKey = searchParams.get('authKey')
  const customerKey = searchParams.get('customerKey')

  const session = await getSession()
  if (!session.userId) {
    return NextResponse.redirect(new URL('/billing?error=login_first', request.url))
  }
  if (!authKey || !customerKey || customerKey !== `gorang_${session.userId}`) {
    return NextResponse.redirect(new URL('/billing?error=invalid_callback', request.url))
  }
  const planInfo = PLAN_PRICES[plan]
  if (!planInfo) {
    return NextResponse.redirect(new URL('/billing?error=invalid_plan', request.url))
  }

  try {
    const billing = await issueBillingKey(authKey, customerKey)

    const nextBillingAt = new Date()
    nextBillingAt.setMonth(nextBillingAt.getMonth() + 1)

    // 카드 등록 성공 시점에 우선 저장 (첫 결제가 실패해도 카드 재등록은 피하기 위해)
    await supabaseAdmin.from('users').update({
      toss_customer_key: customerKey,
      toss_billing_key: billing.billingKey,
      card_company: billing.card?.company ?? null,
      card_last4: billing.card?.number ? billing.card.number.slice(-4) : null,
    }).eq('id', session.userId)

    const orderId = `gorang_${session.userId}_${Date.now()}`
    let charge
    try {
      charge = await chargeBilling(billing.billingKey, {
        customerKey,
        amount: planInfo.amount,
        orderId,
        orderName: `고랑AI ${planInfo.name} 플랜 구독`,
      })
    } catch (chargeErr) {
      await supabaseAdmin.from('payments').insert({
        user_id: session.userId,
        order_id: orderId,
        plan,
        amount: planInfo.amount,
        status: 'failed',
        failure_reason: chargeErr.message,
        raw: chargeErr.raw ?? null,
      })
      return NextResponse.redirect(new URL('/billing?error=charge_failed', request.url))
    }

    await supabaseAdmin.from('users').update({
      plan,
      subscription_status: 'active',
      subscription_started_at: new Date().toISOString(),
      next_billing_at: nextBillingAt.toISOString(),
      cancel_at_period_end: false,
    }).eq('id', session.userId)

    await supabaseAdmin.from('payments').insert({
      user_id: session.userId,
      order_id: orderId,
      plan,
      amount: planInfo.amount,
      status: 'paid',
      toss_payment_key: charge.paymentKey,
      raw: charge,
    })

    return NextResponse.redirect(new URL('/settings?billing=success', request.url))
  } catch (e) {
    console.error('빌링키 발급 실패:', e.message)
    return NextResponse.redirect(new URL('/billing?error=auth_failed', request.url))
  }
}
