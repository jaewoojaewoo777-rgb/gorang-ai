import { NextResponse } from 'next/server'
import { getOAuthClient, getGBPAccounts, getGBPLocations } from '../../../../../lib/google'
import { supabaseAdmin } from '../../../../../lib/db'
import { getSession } from '../../../../../lib/session'

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
    const { data: user, error: dbError } = await supabaseAdmin
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

    if (dbError) throw dbError

    // 5. 세션에 userId 저장
    const session = await getSession()
    session.userId = user.id
    session.googleId = googleId
    await session.save()

    // 6. 가게 정보 있으면 홈으로, 없으면 등록으로
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('shop_name')
      .eq('id', user.id)
      .single()

    const redirectTo = profile?.shop_name?.trim() ? '/home' : '/register'
    return NextResponse.redirect(new URL(redirectTo, request.url))

  } catch (err) {
    console.error('Google OAuth 오류:', err)
    return NextResponse.redirect(new URL('/connect?error=failed', request.url))
  }
}
