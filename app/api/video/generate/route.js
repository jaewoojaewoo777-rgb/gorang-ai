import { NextResponse } from 'next/server'
import { getSession } from '../../../../lib/session'
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// 이미지 base64 → Cloudinary image 업로드
function uploadImage(dataUrl, publicId) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(dataUrl, {
      public_id:     publicId,
      overwrite:     true,
      resource_type: 'image',
      folder:        'gorang-video',
    }, (err, res) => err ? reject(err) : resolve(res))
  })
}

// 텍스트를 n개로 분할
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

// 텍스트에서 특수문자 이스케이프 (Cloudinary text overlay용)
function escapeText(text) {
  return (text || '')
    .replace(/,/g, '%2C')
    .replace(/\//g, '%2F')
    .replace(/\$/g, '%24')
    .replace(/!/g, '%21')
    .replace(/\?/g, '%3F')
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
    const uid    = session.userId
    const ts     = Date.now()
    const n      = imageDataUrls.length
    const SLIDE  = 3    // 슬라이드당 초
    const TRANS  = 0.5  // 전환 초

    // ── 1. 이미지들을 Cloudinary에 업로드 (image 타입) ──
    const uploaded = await Promise.all(
      imageDataUrls.map((d, i) =>
        uploadImage(d, `gorang_${uid}_${ts}_${i}`)
      )
    )
    const pids = uploaded.map(u => u.public_id)

    // ── 2. 폰트 설정 ──
    const FONTS = [
      { titleSize: isPortrait ? 110 : 80, capSize: isPortrait ? 46 : 34, subSize: isPortrait ? 52 : 38 },
      { titleSize: isPortrait ? 100 : 74, capSize: isPortrait ? 42 : 30, subSize: isPortrait ? 48 : 36 },
      { titleSize: isPortrait ? 120 : 88, capSize: isPortrait ? 48 : 36, subSize: isPortrait ? 56 : 40 },
      { titleSize: isPortrait ? 95  : 70, capSize: isPortrait ? 44 : 32, subSize: isPortrait ? 50 : 36 },
      { titleSize: isPortrait ? 105 : 76, capSize: isPortrait ? 46 : 34, subSize: isPortrait ? 54 : 40 },
    ]
    const fc = FONTS[fontStyle % FONTS.length]

    // ── 3. 자막 분할 ──
    const koChunks  = splitText(koText,  n)
    const subChunks = splitText(subText, n)

    // ── 4. 슬라이드쇼 변환 체인 구성 ──
    // 첫 번째 이미지를 비디오로 업로드하고,
    // 나머지를 splice(concat)로 이어붙이는 방식
    const transformation = []

    // 베이스: 첫 이미지 크롭 + 지속시간
    transformation.push({ width: W, height: H, crop: 'fill', gravity: 'center' })
    transformation.push({ duration: SLIDE })

    // 나머지 이미지들 splice로 이어붙임
    for (let i = 1; i < pids.length; i++) {
      const safePid = pids[i].replace(/\//g, ':')
      transformation.push({
        overlay: `image:${safePid}`,
        width: W, height: H,
        crop: 'fill', gravity: 'center',
        flags: `splice:transition_(name_fade;du_${TRANS})`,
        duration: SLIDE,
      })
      transformation.push({ flags: 'layer_apply' })
    }

    // 주제목 (첫 슬라이드 동안 중앙 표시)
    if (titleLine1) {
      transformation.push({
        overlay: {
          font_family:    'Arial',
          font_size:      fc.titleSize,
          font_weight:    'bold',
          font_style:     'italic',
          letter_spacing: 8,
          text:           escapeText(titleLine1),
        },
        color:        '#FFFFFF',
        gravity:      'center',
        y:            titleLine2 ? -Math.round(fc.titleSize * 0.65) : 0,
        start_offset: 0,
        end_offset:   SLIDE,
      })
      transformation.push({ flags: 'layer_apply' })
    }
    if (titleLine2) {
      transformation.push({
        overlay: {
          font_family: 'Arial',
          font_size:   fc.subSize,
          font_weight: 'light',
          text:        escapeText(titleLine2),
        },
        color:        '#F0F0F0',
        gravity:      'center',
        y:            Math.round(fc.titleSize * 0.4),
        start_offset: 0,
        end_offset:   SLIDE,
      })
      transformation.push({ flags: 'layer_apply' })
    }

    // 슬라이드별 하단 자막
    for (let i = 0; i < n; i++) {
      const startSec = i * SLIDE
      const endSec   = startSec + SLIDE
      const safeY_ko  = isPortrait ? 420 : 110
      const safeY_sub = isPortrait ? 370 : 70

      if (koChunks[i]) {
        transformation.push({
          overlay: {
            font_family: 'Arial',
            font_size:   fc.capSize,
            font_weight: 'bold',
            text:        escapeText(koChunks[i]),
          },
          color:        '#FFFFFF',
          gravity:      'south',
          y:            safeY_ko,
          start_offset: startSec,
          end_offset:   endSec,
        })
        transformation.push({ flags: 'layer_apply' })
      }
      if (subChunks[i]) {
        transformation.push({
          overlay: {
            font_family: 'Arial',
            font_size:   Math.round(fc.capSize * 0.82),
            font_weight: 'normal',
            text:        escapeText(subChunks[i]),
          },
          color:        '#C8E6FF',
          gravity:      'south',
          y:            safeY_sub,
          start_offset: startSec,
          end_offset:   endSec,
        })
        transformation.push({ flags: 'layer_apply' })
      }
    }

    // 최종 품질
    transformation.push({ quality: 'auto:good', fetch_format: 'mp4' })

    // ── 5. 첫 이미지를 video 타입으로 재업로드 + eager 변환으로 슬라이드쇼 생성 ──
    // 핵심: 먼저 image로 올린 후, video resource_type으로 다시 업로드해서 변환
    const firstPid = `gorang_base_${uid}_${ts}`
    const videoResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload(imageDataUrls[0], {
        public_id:     firstPid,
        resource_type: 'video',   // video 타입으로 업로드 (이미지→비디오 변환)
        folder:        'gorang-video-output',
        overwrite:     true,
        eager: [{ transformation, format: 'mp4' }],
        eager_async:   false,     // 동기 처리 (완료까지 대기)
      }, (err, res) => err ? reject(err) : resolve(res))
    })

    const videoUrl = videoResult.eager?.[0]?.secure_url || videoResult.secure_url
    if (!videoUrl) throw new Error('영상 URL을 받지 못했어요')

    // ── 6. 임시 이미지 정리 ──
    pids.forEach(pid => {
      cloudinary.uploader.destroy(pid, { resource_type: 'image' }).catch(() => {})
    })

    return NextResponse.json({ ok: true, videoUrl, duration: n * SLIDE })

  } catch (err) {
    console.error('Cloudinary 영상 생성 오류:', err)
    return NextResponse.json({
      ok: false,
      error: err.message || '영상 생성 실패',
      detail: err.http_code || null,
    }, { status: 500 })
  }
}
