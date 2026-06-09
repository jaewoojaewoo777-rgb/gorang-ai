import { NextResponse } from 'next/server'
import { getSession } from '../../../../lib/session'
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// 이미지 base64 → Cloudinary 업로드
async function uploadImage(dataUrl, publicId) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(dataUrl, {
      public_id: publicId,
      overwrite: true,
      resource_type: 'image',
      folder: 'gorang-video',
    }, (err, result) => err ? reject(err) : resolve(result))
  })
}

// 텍스트를 n개 슬라이드로 분할
function splitText(text, n) {
  if (!text) return Array(n).fill('')
  if (n === 1) return [text.trim()]
  const sentences = text.split(/(?<=[.!?。！？])\s+/).map(s => s.trim()).filter(Boolean)
  if (sentences.length >= n) {
    const result = Array(n).fill('')
    const per = Math.ceil(sentences.length / n)
    for (let i = 0; i < n; i++)
      result[i] = sentences.slice(i * per, (i + 1) * per).join(' ').trim()
    return result
  }
  const words = text.split(/\s+/).filter(Boolean)
  const result = Array(n).fill('')
  const per = Math.ceil(words.length / n)
  for (let i = 0; i < n; i++)
    result[i] = words.slice(i * per, (i + 1) * per).join(' ').trim()
  return result
}

export async function POST(request) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  try {
    const {
      imageDataUrls,
      koText,
      subText,
      titleLine1,
      titleLine2,
      bgmUrl,
      isPortrait,
      fontStyle = 0,
    } = await request.json()

    if (!imageDataUrls?.length)
      return NextResponse.json({ error: '이미지 없음' }, { status: 400 })

    const W = isPortrait ? 1080 : 1920
    const H = isPortrait ? 1920 : 1080
    const uid = session.userId
    const ts  = Date.now()
    const n   = imageDataUrls.length
    const SLIDE_DUR = 3   // 슬라이드당 초
    const TRANS_DUR = 0.5 // 전환 초

    // ── 1. 이미지 업로드 ──
    const uploaded = await Promise.all(
      imageDataUrls.map((d, i) => uploadImage(d, `gorang_${uid}_${ts}_${i}`))
    )
    const pids = uploaded.map(u => u.public_id)  // public_id 배열

    // ── 2. 자막 분할 ──
    const koChunks  = splitText(koText,  n)
    const subChunks = splitText(subText, n)

    // ── 3. 폰트 설정 ──
    const FONTS = [
      { titleSize: isPortrait ? 110 : 80, titleFont: 'Arial', subSize: isPortrait ? 52 : 38, capSize: isPortrait ? 46 : 34, weight: 'bold' },
      { titleSize: isPortrait ? 100 : 74, titleFont: 'Arial', subSize: isPortrait ? 48 : 36, capSize: isPortrait ? 42 : 30, weight: 'bold' },
      { titleSize: isPortrait ? 120 : 88, titleFont: 'Arial', subSize: isPortrait ? 56 : 40, capSize: isPortrait ? 48 : 36, weight: 'bold' },
      { titleSize: isPortrait ? 95 : 70,  titleFont: 'Arial', subSize: isPortrait ? 50 : 36, capSize: isPortrait ? 44 : 32, weight: 'bold' },
      { titleSize: isPortrait ? 105 : 76, titleFont: 'Arial', subSize: isPortrait ? 54 : 40, capSize: isPortrait ? 46 : 34, weight: 'bold' },
    ]
    const fc = FONTS[fontStyle % FONTS.length]

    // ── 4. Cloudinary 변환 체인 구성 ──
    // 첫 번째 이미지를 베이스 비디오로, 나머지를 concat으로 붙임
    const transformation = [
      // 베이스 설정
      { width: W, height: H, crop: 'fill', gravity: 'center' },
      { duration: SLIDE_DUR },
    ]

    // 나머지 이미지들을 fade 전환으로 이어 붙임
    for (let i = 1; i < pids.length; i++) {
      transformation.push({
        overlay: `video:${pids[i].replace(/\//g, ':')}`,
        width: W, height: H, crop: 'fill', gravity: 'center',
        flags: `splice:transition_(name_fade;du_${TRANS_DUR})`,
        duration: SLIDE_DUR,
      })
      transformation.push({ flags: 'layer_apply' })
    }

    // 주제목 오버레이 (전체 영상에 걸쳐 처음 SLIDE_DUR초 동안)
    if (titleLine1) {
      transformation.push({
        overlay: {
          font_family: fc.titleFont,
          font_size:   fc.titleSize,
          font_weight: fc.weight,
          font_style:  'italic',
          letter_spacing: 8,
          text: titleLine1,
        },
        color: '#FFFFFF',
        gravity: 'center',
        y: titleLine2 ? -Math.round(fc.titleSize * 0.65) : 0,
        start_offset: 0,
        end_offset: SLIDE_DUR,
      })
      transformation.push({ flags: 'layer_apply' })
    }
    if (titleLine2) {
      transformation.push({
        overlay: {
          font_family: 'Arial',
          font_size:   fc.subSize,
          font_weight: 'normal',
          text: titleLine2,
        },
        color: '#F0F0F0',
        gravity: 'center',
        y: Math.round(fc.titleSize * 0.38),
        start_offset: 0,
        end_offset: SLIDE_DUR,
      })
      transformation.push({ flags: 'layer_apply' })
    }

    // 각 슬라이드별 하단 자막
    for (let i = 0; i < n; i++) {
      const startSec = i * SLIDE_DUR
      const endSec   = startSec + SLIDE_DUR

      if (koChunks[i]) {
        transformation.push({
          overlay: {
            font_family: 'Arial',
            font_size:   fc.capSize,
            font_weight: 'bold',
            text: koChunks[i],
          },
          color: '#FFFFFF',
          gravity: 'south',
          y: isPortrait ? 420 : 110,
          start_offset: startSec,
          end_offset:   endSec,
        })
        transformation.push({ flags: 'layer_apply' })
      }
      if (subChunks[i]) {
        transformation.push({
          overlay: {
            font_family: 'Arial',
            font_size:   Math.round(fc.capSize * 0.8),
            font_weight: 'normal',
            text: subChunks[i],
          },
          color: '#C8E6FF',
          gravity: 'south',
          y: isPortrait ? 370 : 70,
          start_offset: startSec,
          end_offset:   endSec,
        })
        transformation.push({ flags: 'layer_apply' })
      }
    }

    // 최종 품질 + 포맷
    transformation.push({ quality: 'auto:good', fetch_format: 'mp4' })

    // ── 5. eager 변환으로 영상 생성 ──
    const videoResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload(imageDataUrls[0], {
        public_id:     `gorang_output_${uid}_${ts}`,
        resource_type: 'video',
        folder:        'gorang-video-output',
        overwrite:     true,
        eager:         [{ transformation }],
        eager_async:   false,
      }, (err, res) => err ? reject(err) : resolve(res))
    })

    const videoUrl = videoResult.eager?.[0]?.secure_url || videoResult.secure_url

    // ── 6. 업로드한 임시 이미지들 삭제 (옵션) ──
    // 백그라운드에서 삭제 (await 안 함)
    pids.forEach(pid => {
      cloudinary.uploader.destroy(pid, { resource_type: 'image' }).catch(() => {})
    })

    return NextResponse.json({
      ok: true,
      videoUrl,
      duration: n * SLIDE_DUR,
    })

  } catch (err) {
    console.error('Cloudinary 영상 생성 오류:', err)
    return NextResponse.json({
      error: err.message || '영상 생성 실패',
      detail: err.http_code || null,
    }, { status: 500 })
  }
}
