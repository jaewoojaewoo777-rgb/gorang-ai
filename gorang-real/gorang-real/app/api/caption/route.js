import { NextResponse } from 'next/server'
import { getSession } from '../../../lib/session'
import { supabaseAdmin } from '../../../lib/db'
import { generateCaption } from '../../../lib/ai'

export async function POST(request) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { shopName, shopLocation, shopType } = await request.json()

  try {
    const result = await generateCaption({ shopName, shopLocation, shopType })
    return NextResponse.json({ result })
  } catch (err) {
    console.error('캡션 생성 오류:', err)
    return NextResponse.json({ error: '생성 실패' }, { status: 500 })
  }
}
