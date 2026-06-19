import { NextResponse } from 'next/server'
import { getSession } from '../../../../lib/session'
import { supabaseAdmin } from '../../../../lib/db'

export async function GET(request) {
  const session = await getSession()
  const out = {
    실행된_주소: request.url,
    세션있음: !!session.userId,
    userId: session.userId || null,
    googleId: session.googleId || null,
    유저행: null,
    행에러: null,
    연동판정결과: null,
  }
  if (session.userId) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, email, google_name, google_id, shop_name')
      .eq('id', session.userId)
      .maybeSingle()
    out.유저행 = data || null
    out.행에러 = error?.message || null
    out.연동판정결과 = !!data?.google_id
  }
  return NextResponse.json(out)
}
