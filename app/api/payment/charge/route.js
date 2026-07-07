import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/db'
import { chargeBilling, PLAN_PRICES } from '../../../../lib/toss'

// Vercel Cron 전용 — 매일 실행, next_billing_at이 지난 구독을 정산
// CRON_SECRET이 설정되어 있으면 Vercel이 Authorization: Bearer <CRON_SECRET> 헤더로 호출함
export async function GET(request) {
  const secret = process.env.CRON_SECRET
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const { data: dueUsers, error } = await supabaseAdmin
    .from('users')
    .select('id, plan, subscription_status, toss_customer_key, toss_billing_key, cancel_at_period_end, next_billing_at')
    .eq('subscription_status', 'active')
    .lte('next_billing_at', now.toISOString())

  if (error) {
    console.error('정기결제 대상 조회 실패:', error.message)
    return NextResponse.json({ error: '조회 실패' }, { status: 500 })
  }

  const results = []
  for (const user of dueUsers ?? []) {
    // 해지 예약된 구독은 이번 결제 없이 기간 종료 처리
    if (user.cancel_at_period_end) {
      await supabaseAdmin.from('users').update({
        plan: 'none',
        subscription_status: 'inactive',
        next_billing_at: null,
        cancel_at_period_end: false,
      }).eq('id', user.id)
      results.push({ userId: user.id, result: 'canceled' })
      continue
    }

    const planInfo = PLAN_PRICES[user.plan]
    if (!planInfo || !user.toss_billing_key) {
      results.push({ userId: user.id, result: 'skipped_invalid_plan' })
      continue
    }

    const orderId = `gorang_${user.id}_${Date.now()}`
    try {
      const charge = await chargeBilling(user.toss_billing_key, {
        customerKey: user.toss_customer_key,
        amount: planInfo.amount,
        orderId,
        orderName: `고랑AI ${planInfo.name} 플랜 구독`,
      })
      const nextBillingAt = new Date(user.next_billing_at)
      nextBillingAt.setMonth(nextBillingAt.getMonth() + 1)
      await supabaseAdmin.from('users').update({ next_billing_at: nextBillingAt.toISOString() }).eq('id', user.id)
      await supabaseAdmin.from('payments').insert({
        user_id: user.id, order_id: orderId, plan: user.plan, amount: planInfo.amount,
        status: 'paid', toss_payment_key: charge.paymentKey, raw: charge,
      })
      results.push({ userId: user.id, result: 'paid' })
    } catch (chargeErr) {
      await supabaseAdmin.from('users').update({ subscription_status: 'past_due' }).eq('id', user.id)
      await supabaseAdmin.from('payments').insert({
        user_id: user.id, order_id: orderId, plan: user.plan, amount: planInfo.amount,
        status: 'failed', failure_reason: chargeErr.message, raw: chargeErr.raw ?? null,
      })
      results.push({ userId: user.id, result: 'failed' })
    }
  }

  return NextResponse.json({ processed: results.length, results })
}
