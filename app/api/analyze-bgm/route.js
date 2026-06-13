import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Supabase BGM 버킷에 있는 파일 목록 (태그별)
const BGM_FILES = {
  ocean:   ['bgm-ocean.mp3', 'bgm-ocean1.mp3', 'bgm-ocean2.mp3', 'bgm-ocean3.mp3', 'bgm-ocean4.mp3'],
  cafe:    ['bgm-cafe.mp3', 'bgm-cafe1.mp3', 'bgm-cafe2.mp3', 'bgm-cafe3.mp3', 'bgm-cafe4.mp3'],
  lofi:    ['bgm-lofi.mp3', 'bgm-lofi1.mp3', 'bgm-lofi2.mp3', 'bgm-lofi3.mp3', 'bgm-lofi4.mp3'],
  luxury:  ['bgm-luxury.mp3', 'bgm-luxury1.mp3', 'bgm-luxury2.mp3', 'bgm-luxury3.mp3', 'bgm-luxury4.mp3'],
  bright:  ['bgm-bright.mp3', 'bgm-bright1.mp3', 'bgm-bright2.mp3', 'bgm-bright3.mp3', 'bgm-bright4.mp3'],
  night:   ['bgm-night.mp3', 'bgm-night1.mp3', 'bgm-night2.mp3', 'bgm-night3.mp3', 'bgm-night4.mp3'],
}

const SUPABASE_BGM_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/BGM`

export async function POST(request) {
  try {
    const { imageUrls } = await request.json()
    if (!imageUrls?.length) {
      return NextResponse.json({ bgmUrl: randomFrom(BGM_FILES.cafe) })
    }

    // 첫 번째 사진만 분석 (비용 절약)
    const imageUrl = imageUrls[0]

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 50,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'url', url: imageUrl }
          },
          {
            type: 'text',
            text: `이 사진의 분위기를 분석해서 아래 중 딱 하나만 답하세요. 다른 말 없이 태그 하나만:
ocean - 바다, 오션뷰, 해변, 파도
cafe - 카페 내부, 음료, 디저트, 따뜻한 실내
lofi - 감성적, 빈티지, 아늑한, 로맨틱
luxury - 고급스러운, 프리미엄, 화려한, 리조트
bright - 밝고 활기찬, 야외, 화창한, 컬러풀
night - 야경, 저녁, 어두운, 노을`
          }
        ]
      }]
    })

    const tag = msg.content[0]?.text?.trim().toLowerCase() || 'cafe'
    const validTag = BGM_FILES[tag] ? tag : 'cafe'
    const files = BGM_FILES[validTag]
    const picked = files[Math.floor(Math.random() * files.length)]

    return NextResponse.json({
      bgmUrl: `${SUPABASE_BGM_URL}/${picked}`,
      tag: validTag,
      file: picked
    })
  } catch (err) {
    console.error('BGM 분석 오류:', err)
    // 실패 시 cafe로 fallback
    const fallback = BGM_FILES.cafe[Math.floor(Math.random() * BGM_FILES.cafe.length)]
    return NextResponse.json({
      bgmUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/BGM/${fallback}`,
      tag: 'cafe'
    })
  }
}
