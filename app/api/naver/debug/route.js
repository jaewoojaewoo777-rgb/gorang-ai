import { NextResponse } from 'next/server'
import { getSession } from '../../../../lib/session'
import { supabaseAdmin } from '../../../../lib/db'
import { decrypt } from '../../../../lib/crypto'

// 임시 진단용 — 리뷰 카드 셀렉터가 실제 화면과 안 맞을 때 워커의 /debug를 호출해
// 원본 HTML 구조를 확인하기 위함. 셀렉터 확정되면 이 라우트도 지워도 됨.
export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { data: conn, error: connErr } = await supabaseAdmin
    .from('naver_connections')
    .select('*')
    .eq('user_id', session.userId)
    .single()

  if (connErr || !conn) {
    return NextResponse.json({ error: '네이버 플레이스 연동 정보 없음' }, { status: 400 })
  }

  try {
    const cookies = JSON.parse(
      decrypt({ encrypted: conn.encrypted_session, iv: conn.session_iv, authTag: conn.session_auth_tag })
    )

    const base = process.env.NAVER_WORKER_URL.replace(/\/$/, '')
    const res = await fetch(`${base}/debug`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.NAVER_WORKER_SECRET}`,
      },
      body: JSON.stringify({ cookies, placeId: conn.place_id, bookingBusinessId: conn.booking_business_id }),
    })

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
