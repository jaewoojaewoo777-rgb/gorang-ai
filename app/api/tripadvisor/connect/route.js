import { NextResponse } from 'next/server'
import { getSession } from '../../../../lib/session'
import { supabaseAdmin } from '../../../../lib/db'

export const dynamic = 'force-dynamic'

const TA_KEY = process.env.TRIPADVISOR_API_KEY

// 장소 ID 유효성 확인: details API로 이름 받아오기
async function fetchLocationName(locationId) {
  const url = `https://api.content.tripadvisor.com/api/v1/location/${locationId}/details?key=${TA_KEY}&language=ko`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`TripAdvisor API 오류: ${res.status}`)
  const data = await res.json()
  return data.name || locationId
}

export async function POST(request) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  try {
    const { locationId } = await request.json()
    if (!locationId) return NextResponse.json({ error: 'locationId 필요' }, { status: 400 })
    if (!TA_KEY) return NextResponse.json({ error: 'TRIPADVISOR_API_KEY 미설정' }, { status: 500 })

    const locationName = await fetchLocationName(locationId)

    const { error } = await supabaseAdmin
      .from('users')
      .update({ tripadvisor_location_id: locationId, tripadvisor_location_name: locationName })
      .eq('id', session.userId)

    if (error) throw error
    return NextResponse.json({ ok: true, locationName })
  } catch (err) {
    console.error('[tripadvisor/connect]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// 현재 연동 상태 확인
export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('users')
    .select('tripadvisor_location_id, tripadvisor_location_name')
    .eq('id', session.userId)
    .single()

  return NextResponse.json({
    locationId: data?.tripadvisor_location_id || null,
    locationName: data?.tripadvisor_location_name || null,
  })
}
