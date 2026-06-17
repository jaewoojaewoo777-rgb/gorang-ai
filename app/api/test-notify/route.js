import { NextResponse } from 'next/server'
import { getSession } from '../../../lib/session'
import { supabaseAdmin } from '../../../lib/db'
import { sendBadReviewAlert } from '../../../lib/solapi'

export async function POST() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('phone, shop_name')
    .eq('id', session.userId)
    .single()

  if (!user?.phone) {
    return NextResponse.json({ error: 'phone_missing', message: 'users 테이블에 phone 값이 없어요' }, { status: 400 })
  }

  try {
    const result = await sendBadReviewAlert({
      to: user.phone,
      shopName: user.shop_name || '테스트 가게',
      star: 1,
      summary: '음식이 너무 형편없고 직원도 불친절했습니다. 다시는 오지 않겠습니다.',
      reply1: '안녕하세요. 불편한 경험을 드려 진심으로 사과드립니다. 더 나은 서비스로 보답하겠습니다.',
      reply2: '소중한 의견 감사합니다. 말씀하신 부분 개선을 위해 노력하겠습니다.',
    })
    return NextResponse.json({ ok: true, to: user.phone, result })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
