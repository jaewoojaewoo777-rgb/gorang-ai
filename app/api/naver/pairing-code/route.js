import { NextResponse } from 'next/server'
import { getSession } from '../../../../lib/session'
import { supabaseAdmin } from '../../../../lib/db'

// 크롬 확장에서 세션쿠키를 우리 계정과 짝지을 때 쓰는 1회용 6자리 코드 발급.
// 로그인 상태(브라우저 쿠키)만으로는 확장이 어느 gorang-ai 계정인지 알 수 없어서 필요.
export async function POST() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const code = String(Math.floor(100000 + Math.random() * 900000))
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5분

  const { error } = await supabaseAdmin
    .from('users')
    .update({ naver_pairing_code: code, naver_pairing_code_expires_at: expiresAt })
    .eq('id', session.userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ code, expiresAt })
}
