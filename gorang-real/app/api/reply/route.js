import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { supabaseAdmin } from '@/lib/db'
import { generateReviewReply } from '@/lib/ai'

export async function POST(request) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { reviewText, language } = await request.json()

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('shop_name')
    .eq('id', session.userId)
    .single()

  try {
    const result = await generateReviewReply({
      shopName: user?.shop_name || '제주 펜션',
      reviewText,
      language,
    })
    return NextResponse.json({ result })
  } catch (err) {
    console.error('답변 생성 오류:', err)
    return NextResponse.json({ error: '생성 실패' }, { status: 500 })
  }
}
