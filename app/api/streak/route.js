import { NextResponse } from 'next/server'
import { getSession } from '../../../lib/session'
import { getStreak } from '../../../lib/streak'

export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const streak = await getStreak(session.userId)
  return NextResponse.json({ ok: true, ...streak })
}
