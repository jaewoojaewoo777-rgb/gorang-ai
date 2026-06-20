import { NextResponse } from 'next/server'
import { getSession } from '../../../../lib/session'
import { supabaseAdmin } from '../../../../lib/db'

export async function POST() {
  const session = await getSession()
  if (!session.userId) {
    return NextResponse.json({ error: '로그인 필요' }, { status: 401 })
  }

  const { error } = await supabaseAdmin
    .from('users')
    .update({
      tiktok_open_id: null,
      tiktok_access_token: null,
      tiktok_refresh_token: null,
    })
    .eq('id', session.userId)

  if (error) {
    console.error('tiktok disconnect error:', error)
    return NextResponse.json({ error: '연동 해제 실패' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
