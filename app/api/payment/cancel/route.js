import { NextResponse } from 'next/server'
import { getSession } from '../../../../lib/session'
import { supabaseAdmin } from '../../../../lib/db'

// 구독 해지 예약 — 이번 결제 기간이 끝나는 next_billing_at까지는 계속 이용 가능
export async function POST() {
  const session = await getSession()
  if (!session.userId) {
    return NextResponse.json({ error: '로그인 필요' }, { status: 401 })
  }

  const { error } = await supabaseAdmin
    .from('users')
    .update({ cancel_at_period_end: true })
    .eq('id', session.userId)

  if (error) {
    console.error('구독 해지 예약 실패:', error.message)
    return NextResponse.json({ error: '해지 처리 실패' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
