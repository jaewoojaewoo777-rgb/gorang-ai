import { getAuthUrl } from '../../../../lib/google'
import { NextResponse } from 'next/server'

export async function GET(request) {
  // ?reauth=1 → 계정/채널 선택 화면 강제 (유튜브 채널 변경/다시 연동용)
  const forceSelect = new URL(request.url).searchParams.get('reauth') === '1'
  const url = getAuthUrl({ forceSelect })
  return NextResponse.redirect(url)
}
