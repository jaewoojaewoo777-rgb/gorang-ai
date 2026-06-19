import { NextResponse } from 'next/server'
import { exchangeMetaCode, getLongLivedToken, getMetaPages } from '../../../../../lib/meta'
import { supabaseAdmin } from '../../../../../lib/db'
import { getSession } from '../../../../../lib/session'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code  = searchParams.get('code')
  const error = searchParams.get('error')
  const state = searchParams.get('state')

  const session = await getSession()

  if (error || !code) {
    return NextResponse.redirect(new URL('/connect?error=meta_cancelled', request.url))
  }
  if (!session.userId) {
    return NextResponse.redirect(new URL('/connect?error=login_first', request.url))
  }
  if (!state || state !== session.metaState) {
    return NextResponse.redirect(new URL('/connect?error=meta_state', request.url))
  }

  try {
    // 단기 토큰 → 장기 토큰(60일)
    const short = await exchangeMetaCode(code)
    const long  = await getLongLivedToken(short.access_token)
    const userToken = long.access_token
    const expiry = long.expires_in
      ? new Date(Date.now() + long.expires_in * 1000).toISOString()
      : null

    // FB 페이지 목록 조회 (첫 번째 페이지 자동 선택)
    const pages = await getMetaPages(userToken)
    const page = pages[0] || null

    const igUserId = page?.instagram_business_account?.id || null
    const fbPageId = page?.id || null
    const fbPageName = page?.name || null
    const fbPageToken = page?.access_token || null

    await supabaseAdmin
      .from('users')
      .update({
        meta_access_token: userToken,
        meta_token_expiry: expiry,
        instagram_user_id: igUserId,
        fb_page_id: fbPageId,
        fb_page_name: fbPageName,
        fb_page_access_token: fbPageToken,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.userId)

    session.metaState = null
    await session.save()

    return NextResponse.redirect(new URL('/connect?meta=connected', request.url))
  } catch (err) {
    console.error('Meta OAuth 오류:', err)
    return NextResponse.redirect(new URL('/connect?error=meta_failed', request.url))
  }
}
