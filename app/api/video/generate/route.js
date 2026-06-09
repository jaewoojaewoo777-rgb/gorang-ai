import { NextResponse } from 'next/server'
import { getSession } from '../../../../lib/session'
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// 이미지 base64 → Cloudinary image 업로드 (Promise)
function uploadImage(dataUrl, publicId) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(dataUrl, {
      public_id:     publicId,
      overwrite:     true,
      resource_type: 'image',   // 반드시 image
      folder:        'gorang-slides',
    }, (err, res) => err ? reject(err) : resolve(res))
  })
}

// 텍스트 분할
function splitText(text, n) {
  if (!text) return Array(n).fill('')
  if (n === 1) return [text.trim()]
  const sentences = text.split(/(?<=[.!?。！？])\s+/).map(s => s.trim()).filter(Boolean)
  if (sentences.length >= n) {
    const res = Array(n).fill('')
    const per = Math.ceil(sentences.length / n)
    for (let i = 0; i < n; i++)
      res[i] = sentences.slice(i * per, (i + 1) * per).join(' ').trim()
    return res
  }
  const words = text.split(/\s+/).filter(Boolean)
  const res = Array(n).fill('')
  const per = Math.ceil(words.length / n)
  for (let i = 0; i < n; i++)
    res[i] = words.slice(i * per, (i + 1) * per).join(' ').trim()
  return res
}

// Cloudinary text overlay용 특수문자 이스케이프
function esc(text) {
  return (text || '')
    .replace(/%/g, '%25')
    .replace(/,/g, '%2C')
    .replace(/\//g, '%2F')
    .replace(/\$/g, '%24')
    .replace(/!/g, '%21')
    .replace(/\?/g, '%3F')
    .replace(/#/g, '%23')
    .replace(/&/g, '%26')
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
      isPortrait,
      fontStyle = 0,
    } = await request.json()

    if (!imageDataUrls?.length)
      return NextResponse.json({ error: '이미지 없음' }, { status: 400 })

    const W    = isPortrait ? 1080 : 1920
    const H    = isPortrait ? 1920 : 1080
    const uid  = session.userId
    const ts   = Date.now()
    const n    = imageDataUrls.length
    const SLIDE = 3

    // ── 1. 이미지를 Cloudinary에 image로 업로드 ──
    const uploaded = await Promise.all(
      imageDataUrls.map((d, i) =>
        uploadImage(d, `gorang_${uid}_${ts}_${i}`)
      )
    )
    const pids = uploaded.map(u => u.public_id)

    // ── 2. 폰트 설정 ──
    const FONTS = [
      { tSize: isPortrait ? 110 : 80, kSize: isPortrait ? 46 : 34, sSize: isPortrait ? 36 : 26 },
      { tSize: isPortrait ? 100 : 74, kSize: isPortrait ? 42 : 30, sSize: isPortrait ? 34 : 24 },
      { tSize: isPortrait ? 120 : 88, kSize: isPortrait ? 50 : 36, sSize: isPortrait ? 40 : 28 },
      { tSize: isPortrait ? 95  : 70, kSize: isPortrait ? 44 : 32, sSize: isPortrait ? 36 : 26 },
      { tSize: isPortrait ? 105 : 76, kSize: isPortrait ? 46 : 34, sSize: isPortrait ? 38 : 28 },
    ]
    const fc = FONTS[fontStyle % FONTS.length]

    // ── 3. 자막 분할 ──
    const koChunks  = splitText(koText,  n)
    const subChunks = splitText(subText, n)

    // ── 4. Cloudinary 변환 체인 (image → video slideshow) ──
    // 핵심: 첫 이미지를 video 타입으로 업로드 + splice로 나머지 이어붙임
    // image 타입 overlay를 video에 splice하는 올바른 방법
    const transformation = []

    // 베이스 크기 설정
    transformation.push({ width: W, height: H, crop: 'fill', gravity: 'center' })
    transformation.push({ duration: SLIDE })

    // 나머지 이미지 슬라이드 이어붙임 (fl_splice)
    for (let i = 1; i < pids.length; i++) {
      // public_id의 / → : 변환 (Cloudinary overlay 규칙)
      const overlayId = pids[i].replace(/\//g, ':')
      transformation.push({
        overlay: `image:${overlayId}`,
        flags: 'splice',
        width: W, height: H,
        crop: 'fill', gravity: 'center',
        duration: SLIDE,
      })
      transformation.push({ flags: 'layer_apply' })
    }

    // 주제목 오버레이 (첫 슬라이드 동안)
    if (titleLine1) {
      const yOffset = titleLine2 ? -Math.round(fc.tSize * 0.65) : 0
      transformation.push({
        overlay: {
          font_family:    'Arial',
          font_size:      fc.tSize,
          font_weight:    'bold',
          font_style:     'italic',
          letter_spacing: 8,
          text:           esc(titleLine1),
        },
        color:        'white',
        gravity:      'center',
        y:            yOffset,
        start_offset: 0,
        end_offset:   SLIDE,
      })
      transformation.push({ flags: 'layer_apply' })
    }
    if (titleLine2) {
      transformation.push({
        overlay: {
          font_family: 'Arial',
          font_size:   Math.round(fc.tSize * 0.48),
          font_weight: 'normal',
          text:        esc(titleLine2),
        },
        color:        'white',
        gravity:      'center',
        y:            Math.round(fc.tSize * 0.38),
        start_offset: 0,
        end_offset:   SLIDE,
      })
      transformation.push({ flags: 'layer_apply' })
    }

    // 슬라이드별 하단 자막
    for (let i = 0; i < n; i++) {
      const s = i * SLIDE
      const e = s + SLIDE
      const koY  = isPortrait ? 420 : 110
      const subY = isPortrait ? 370 : 70

      if (koChunks[i]) {
        transformation.push({
          overlay: {
            font_family: 'Arial',
            font_size:   fc.kSize,
            font_weight: 'bold',
            text:        esc(koChunks[i]),
          },
          color:        'white',
          gravity:      'south',
          y:            koY,
          start_offset: s,
          end_offset:   e,
        })
        transformation.push({ flags: 'layer_apply' })
      }
      if (subChunks[i]) {
        transformation.push({
          overlay: {
            font_family: 'Arial',
            font_size:   fc.sSize,
            font_weight: 'normal',
            text:        esc(subChunks[i]),
          },
          color:        'rgb:C8E6FF',
          gravity:      'south',
          y:            subY,
          start_offset: s,
          end_offset:   e,
        })
        transformation.push({ flags: 'layer_apply' })
      }
    }

    transformation.push({ quality: 'auto:good', fetch_format: 'mp4' })

    // ── 5. 슬라이드쇼 영상 생성 ──
    // resource_type: 'video' + 첫 이미지 base64 → Cloudinary가 이미지를 비디오 클립으로 처리
    const outputId = `gorang_out_${uid}_${ts}`
    const videoResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${pids[0]}`,
        {
          public_id:     outputId,
          resource_type: 'video',
          folder:        'gorang-output',
          overwrite:     true,
          eager:         [{ transformation, format: 'mp4' }],
          eager_async:   false,
        },
        (err, res) => err ? reject(err) : resolve(res)
      )
    })

    const videoUrl = videoResult.eager?.[0]?.secure_url || videoResult.secure_url
    if (!videoUrl) throw new Error('영상 URL을 받지 못했어요')

    // 임시 이미지 삭제
    pids.forEach(pid => {
      cloudinary.uploader.destroy(pid, { resource_type: 'image' }).catch(() => {})
    })

    return NextResponse.json({ ok: true, videoUrl, duration: n * SLIDE })

  } catch (err) {
    console.error('Cloudinary 오류:', err)
    return NextResponse.json({
      ok: false,
      error: err.message || '영상 생성 실패',
      detail: err.http_code,
    }, { status: 500 })
  }
}
