import { NextResponse } from 'next/server'
import { getSession } from '../../../../lib/session'
import { checkPhotos } from '../../../../lib/ai'

export async function POST(request) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { imageBase64List } = await request.json()
  try {
    const results = await checkPhotos({ imageBase64List: imageBase64List || [] })
    return NextResponse.json({ results })
  } catch (err) {
    console.error('사진 점검 오류:', err)
    return NextResponse.json({ error: '점검 실패' }, { status: 500 })
  }
}
