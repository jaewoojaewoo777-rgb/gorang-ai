import { NextResponse } from 'next/server'
import { getSession } from '../../../../lib/session'
import { supabaseAdmin } from '../../../../lib/db'

export async function POST(request) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  try {
    const { token } = await request.json()
    if (!token?.trim()) return NextResponse.json({ error: '토큰을 입력해주세요' }, { status: 400 })

    // 토큰 유효성 확인 (봇 프로필 조회)
    const verifyRes = await fetch('https://api.line.me/v2/bot/info', {
      headers: { Authorization: `Bearer ${token.trim()}` },
    })
    const verifyData = await verifyRes.json()
    if (!verifyRes.ok) {
      throw new Error(verifyData.message || '유효하지 않은 토큰이에요')
    }

    await supabaseAdmin
      .from('users')
      .update({
        line_channel_access_token: token.trim(),
        line_bot_name: verifyData.displayName || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.userId)

    return NextResponse.json({ ok: true, botName: verifyData.displayName })
  } catch (err) {
    console.error('[LINE] 토큰 저장 오류:', err)
    return NextResponse.json({ error: err.message || '저장 실패' }, { status: 500 })
  }
}
