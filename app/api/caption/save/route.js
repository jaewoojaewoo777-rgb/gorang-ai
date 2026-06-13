// app/api/captions/save/route.js
import { NextResponse } from 'next/server'
import { getSession } from '../../../../lib/session'
import { supabaseAdmin } from '../../../../lib/db'

// POST: 업로드 완료 시 캡션 자동 저장
export async function POST(req) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { caption, source, platform, photo_tags, was_modified } = await req.json()

  // 사용자 shop_type 자동으로 가져옴 (사장님한테 안 물어봐도 됨)
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('shop_type')
    .eq('id', session.userId)
    .single()

  const shopType = user?.shop_type || null

  // 등급 자동 계산
  // 직접 작성했거나 AI꺼 수정했으면 → 1등급
  // AI 그대로면 → 2등급
  const tier = (source === 'user_written' || was_modified === true) ? 1 : 2

  const { data, error } = await supabaseAdmin
    .from('captions')
    .insert({
      user_id: session.userId,
      caption,
      source,              // ai_auto | prompt | user_written | ai_edited
      shop_type: shopType,
      photo_tags: photo_tags || [],
      platform,
      was_modified: was_modified || false,
      starred: false,
      tier,
      deleted: false,
    })
    .select('id')
    .single()

  if (error) {
    console.error('캡션 저장 오류:', error)
    return NextResponse.json({ error: '저장 실패' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, captionId: data.id })
}

// PATCH: 별표 토글 (사장님이 ⭐ 누를 때)
export async function PATCH(req) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { captionId, starred } = await req.json()

  const { error } = await supabaseAdmin
    .from('captions')
    .update({
      starred,
      tier: starred ? 1 : 2,  // 별표 누르면 1등급, 취소하면 2등급으로
    })
    .eq('id', captionId)
    .eq('user_id', session.userId)  // 본인 캡션만

  if (error) return NextResponse.json({ error: '업데이트 실패' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
