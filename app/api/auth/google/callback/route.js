import { getIronSession } from 'iron-session'
import { NextResponse } from 'next/server'
import { getOAuthClient, getGBPAccounts, getGBPLocations } from '../../../../../lib/google'
import { supabaseAdmin } from '../../../../../lib/db'

const SESSION_OPTIONS = {
  password: process.env.SESSION_SECRET || 'gorang-ai-default-secret-change-me-32ch',
  cookieName: 'gorang_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
  },
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL('/connect?error=cancelled', request.url))
  }

  try {
    // 1. 토큰 교환
    const oauthClient = getOAuthClient()
    const { tokens } = await oauthClient.getToken(code)
    oauthClient.setCredentials(tokens)

    // 2. 사용자 정보 가져오기
    const oauth2 = (await import('googleapis')).google.oauth2('v2')
    const userInfo = await oauth2.userinfo.get({ auth: oauthClient })
    const { id: googleId, email, name } = userInfo.data

    // 3. GBP 계정/장소 정보 가져오기
    let gbpAccountId = null
    let gbpLocationId = null
    try {
      const accounts = await getGBPAccounts(oauthClient)
      if (accounts.length > 0) {
        gbpAccountId = accounts[0].name.split('/')[1]
        const locations = await getGBPLocations(oauthClient, accounts[0].name)
        if (locations.length > 0) {
          gbpLocationId = locations[0].name.split('/')[3]
        }
      }
    } catch (e) {
      console.log('GBP 정보 없음 (정상):', e.message)
    }

    // 4. Supabase에 사용자 저장/업데이트
    let { data: user, error: dbError } = await supabaseAdmin
      .from('users')
      .upsert({
        google_id: googleId,
        email,
        google_name: name,
        google_access_token: tokens.access_token,
        google_refresh_token: tokens.refresh_token,
        google_token_expiry: tokens.expiry_date
          ? new Date(tokens.expiry_date).toISOString()
          : null,
        gbp_account_id: gbpAccountId,
        gbp_location_id: gbpLocationId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'google_id' })
      .select()
      .single()

    if (dbError) {
      console.error('Google upsert 오류 (전체):', dbError.message)
      const res = await supabaseAdmin
        .from('users')
        .upsert({
          google_id: googleId,
          email,
          google_name: name,
          gbp_account_id: gbpAccountId,
          gbp_location_id: gbpLocationId,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'google_id' })
        .select()
        .single()
      if (res.error) throw res.error
      user = res.data
    }

    // 5. 가게 정보 확인 후 리다이렉트 URL 결정
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('shop_name')
      .eq('id', user.id)
      .single()

    const redirectTo = profile?.shop_name?.trim() ? '/home' : '/register'
    const response = NextResponse.redirect(new URL(redirectTo, request.url))

    // 6. 세션 쿠키를 리다이렉트 응답에 직접 기록
    //    (cookies() 패턴은 Route Handler redirect에서 쿠키가 누락됨 → 이 패턴으로 수정)
    const session = await getIronSession(request, response, SESSION_OPTIONS)
    session.userId = user.id
    session.googleId = googleId
    await session.save()

    return response

  } catch (err) {
    console.error('Google OAuth 오류:', err)
    return NextResponse.redirect(new URL('/connect?error=failed', request.url))
  }
}
