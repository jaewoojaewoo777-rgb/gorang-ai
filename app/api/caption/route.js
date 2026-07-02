import { NextResponse } from 'next/server'
import { getSession } from '../../../lib/session'
import { supabaseAdmin } from '../../../lib/db'
import { generateCaption } from '../../../lib/ai'

export async function POST(request) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { shopName, shopLocation, shopType, customPrompt, subLang, imageBase64List, tone } = await request.json()

  let brandVoice = null
  if (tone === 'custom') {
    const { data } = await supabaseAdmin.from('users').select('brand_voice').eq('id', session.userId).single()
    brandVoice = data?.brand_voice || null
  }

  try {
    const result = await generateCaption({
      shopName,
      shopLocation,
      shopType,
      customPrompt,
      subLang,
      imageBase64List: imageBase64List || [],
      tone: tone || 'trendy',
      brandVoice,
    })
    return NextResponse.json({ result })
  } catch (err) {
    console.error('캡션 생성 오류:', err)
    return NextResponse.json({ error: '생성 실패' }, { status: 500 })
  }
}
