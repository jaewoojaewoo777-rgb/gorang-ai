import { NextResponse } from 'next/server'
import { getSession } from '../../../../lib/session'
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// image 업로드
function uploadImage(dataUrl, publicId) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(dataUrl, {
      public_id: publicId,
      overwrite: true,
      resource_type: 'image',
      folder: 'gorang-video',
    }, (err, res) => err ? reject(err) : resolve(res))
  })
}

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

function esc(text) {
  return (text || '')
    .replace(/%/g, '%25')
    .replace(/,/g, '%2C')
    .replace(/\//g, '%2F')
    .replace(/\$/g, '%24')
    .replace(/!/g, '%21')
    .replace(/\?/g, '%3F')
    .replace(/#/g, '%23')
}

export async function POST(request) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  try {
    const { imageDataUrls, koText, subText, titleLine1, titleLine2, isPortrait, fontStyle = 0 } = await request.json()

    if (!imageDataUrls?.length)
      return NextResponse.json({ error: '이미지 없음' }, { status: 400 })

    const W = isPortrait ? 1080 : 1920
    const H = isPortrait ? 1920 : 1080
    const uid = session.userId
    const ts = Date.now()
    const n = imageDataUrls.length
    const SLIDE = 3

    // ── 1. 모든 이미지를 image 타입으로 업로드 ──
    const uploaded = await Promise.all(
      imageDataUrls.map((d, i) => uploadImage(d, `gorang_img_${uid}_${ts}_${i}`))
    )
    const imgPids = uploaded.map(u => u.public_id)

    // ── 2. 폰트/자막 설정 ──
    const FONTS = [
      { tSize: isPortrait ? 110 : 80, kSize: isPortrait ? 46 : 34, sSize: isPortrait ? 36 : 26 },
      { tSize: isPortrait ? 100 : 74, kSize: isPortrait ? 42 : 30, sSize: isPortrait ? 34 : 24 },
      { tSize: isPortrait ? 120 : 88, kSize: isPortrait ? 50 : 36, sSize: isPortrait ? 40 : 28 },
      { tSize: isPortrait ? 95  : 70, kSize: isPortrait ? 44 : 32, sSize: isPortrait ? 36 : 26 },
      { tSize: isPortrait ? 105 : 76, kSize: isPortrait ? 46 : 34, sSize: isPortrait ? 38 : 28 },
    ]
    const fc = FONTS[fontStyle % FONTS.length]
    const koChunks  = splitText(koText,  n)
    const subChunks = splitText(subText, n)

    // ── 3. Cloudinary URL 변환 방식으로 슬라이드쇼 생성 ──
    // image/upload URL에 video 변환 파라미터를 붙여서 mp4 URL을 직접 생성
    // 이 방식은 resource_type 충돌 없이 동작
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME

    // 각 이미지에 적용할 변환 빌드
    const buildSlideTransform = (pid, slideIndex, isFirst) => {
      const parts = []
      const safePid = pid.replace(/\//g, ':')
      const s = slideIndex * SLIDE
      const e = s + SLIDE

      // 이미지 크롭
      parts.push(`l_${safePid},w_${W},h_${H},c_fill,g_center,du_${SLIDE}`)
      parts.push('fl_layer_apply')
      return parts
    }

    // Cloudinary 변환 URL 방식 대신 eager + image→video 변환 사용
    // 핵심: image를 video로 먼저 변환(fl_document:fps_0)한 다음 splice로 합침
    const transformation = []

    // 베이스 이미지를 video 클립으로 (이미지를 video처럼 처리)
    transformation.push({ width: W, height: H, crop: 'fill', gravity: 'center' })
    transformation.push({ duration: SLIDE })

    // 나머지 이미지들을 image overlay + splice로 이어붙임
    for (let i = 1; i < imgPids.length; i++) {
      const oid = imgPids[i].replace(/\//g, ':')
      transformation.push({
        overlay: { public_id: oid, resource_type: 'image' },
        flags: 'splice',
        width: W, height: H,
        crop: 'fill', gravity: 'center',
        duration: SLIDE,
      })
      transformation.push({ flags: 'layer_apply' })
    }

    // 주제목
    if (titleLine1) {
      transformation.push({
        overlay: { font_family: 'Arial', font_size: fc.tSize, font_weight: 'bold', font_style: 'italic', letter_spacing: 8, text: esc(titleLine1) },
        color: 'white', gravity: 'center',
        y: titleLine2 ? -Math.round(fc.tSize * 0.65) : 0,
        start_offset: 0, end_offset: SLIDE,
      })
      transformation.push({ flags: 'layer_apply' })
    }
    if (titleLine2) {
      transformation.push({
        overlay: { font_family: 'Arial', font_size: Math.round(fc.tSize * 0.48), font_weight: 'normal', text: esc(titleLine2) },
        color: 'white', gravity: 'center',
        y: Math.round(fc.tSize * 0.38),
        start_offset: 0, end_offset: SLIDE,
      })
      transformation.push({ flags: 'layer_apply' })
    }

    // 슬라이드별 자막
    for (let i = 0; i < n; i++) {
      const s = i * SLIDE, e = s + SLIDE
      if (koChunks[i]) {
        transformation.push({
          overlay: { font_family: 'Arial', font_size: fc.kSize, font_weight: 'bold', text: esc(koChunks[i]) },
          color: 'white', gravity: 'south', y: isPortrait ? 420 : 110,
          start_offset: s, end_offset: e,
        })
        transformation.push({ flags: 'layer_apply' })
      }
      if (subChunks[i]) {
        transformation.push({
          overlay: { font_family: 'Arial', font_size: fc.sSize, font_weight: 'normal', text: esc(subChunks[i]) },
          color: 'rgb:C8E6FF', gravity: 'south', y: isPortrait ? 370 : 70,
          start_offset: s, end_offset: e,
        })
        transformation.push({ flags: 'layer_apply' })
      }
    }
    transformation.push({ quality: 'auto:good', fetch_format: 'mp4' })

    // ── 4. 첫 이미지를 video 타입으로 재업로드 (image URL 통해서) ──
    // Cloudinary signed URL로 이미지를 PNG 변환 후 video로 fetch
    const firstImageUrl = cloudinary.url(imgPids[0], {
      resource_type: 'image',
      format: 'png',   // PNG는 video로 변환 가능
      secure: true,
    })

    const videoResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload(firstImageUrl, {
        public_id: `gorang_out_${uid}_${ts}`,
        resource_type: 'video',
        folder: 'gorang-output',
        overwrite: true,
        eager: [{ transformation, format: 'mp4' }],
        eager_async: false,
      }, (err, res) => err ? reject(err) : resolve(res))
    })

    const videoUrl = videoResult.eager?.[0]?.secure_url || videoResult.secure_url
    if (!videoUrl) throw new Error('영상 URL 없음')

    imgPids.forEach(pid =>
      cloudinary.uploader.destroy(pid, { resource_type: 'image' }).catch(() => {})
    )

    return NextResponse.json({ ok: true, videoUrl, duration: n * SLIDE })

  } catch (err) {
    console.error('[video/generate]', err)
    return NextResponse.json({
      ok: false, error: err.message || '영상 생성 실패', detail: err.http_code,
    }, { status: 500 })
  }
}
