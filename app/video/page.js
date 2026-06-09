'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { BottomNav, TopBar, PrimaryBtn, GhostBtn, AiBox, LoadingDots } from '../../components/ui'

const BGM_LIST = [
  { id: 'auto',    name: '✨ AI 자동 선택' },
  { id: 'none',    name: '🔇 없음' },
  { id: 'ocean',   name: '🌊 오션뷰' },
  { id: 'cafe',    name: '☕ 카페 감성' },
  { id: 'lofi',    name: '🎧 Lo-fi 무드' },
  { id: 'luxury',  name: '💎 럭셔리' },
  { id: 'bright',  name: '☀️ 밝고 경쾌' },
  { id: 'night',   name: '🌙 야경/저녁' },
]

// 태그별 Supabase BGM 파일 목록
const BGM_FILES = {
  ocean:   ['bgm-ocean.mp3', 'bgm-ocean1.mp3'],
  cafe:    ['bgm-cafe.mp3', 'bgm-cafe1.mp3', 'bgm-cafe2.mp3', 'bgm-cafe3.mp3'],
  lofi:    ['bgm-lofi.mp3', 'bgm-lofi1.mp3'],
  luxury:  ['bgm-luxury.mp3', 'bgm-luxury1.mp3'],
  bright:  ['bgm-bright.mp3', 'bgm-bright1.mp3', 'bgm-bright2.mp3', 'bgm-bright3.mp3'],
  night:   ['bgm-night.mp3'],
}

// 한국어 필수 + 1개 선택 (이중자막)
const SUB_LANG = [
  { code: 'en', flag: '🇺🇸', name: '영어' },
  { code: 'ja', flag: '🇯🇵', name: '일본어' },
  { code: 'zh', flag: '🇨🇳', name: '중국어' },
]

const PLATFORMS = [
  { id: 'youtube_shorts', icon: '▶️', name: 'YouTube Shorts', ratio: 'portrait',  ratioLabel: '세로 9:16' },
  { id: 'instagram',      icon: '📸', name: 'Instagram 릴스',  ratio: 'portrait',  ratioLabel: '세로 9:16' },
  { id: 'tiktok',         icon: '🎵', name: 'TikTok',          ratio: 'portrait',  ratioLabel: '세로 9:16' },
  { id: 'youtube',        icon: '📺', name: 'YouTube 일반',     ratio: 'landscape', ratioLabel: '가로 16:9' },
]

// 예시 프롬프트 (바이럴 카페/관광 영상 분석 기반)
const PROMPT_EXAMPLES = [
  {
    title: '🌅 오션뷰 감성 강조',
    text: '서귀포 모슬포항 오션뷰가 보이는 카페야. 바다와 카페 내부의 따뜻한 분위기가 부각되게, 첫 문장은 감성적인 한 줄 훅으로 시작해줘.',
  },
  {
    title: '☕ 시그니처 메뉴 어필',
    text: '한라봉 에이드가 시그니처인 제주 카페야. 메뉴의 상큼함과 비주얼이 먹고 싶어지게, 짧고 임팩트 있는 문장으로 만들어줘.',
  },
  {
    title: '🏡 프라이빗 펜션 휴식',
    text: '제주 동쪽 조용한 독채 펜션이야. 프라이빗하고 힐링되는 분위기를 강조하고, "이런 휴식 어때요?" 같은 질문형 훅으로 시작해줘.',
  },
]

const SUB_INFO = `📌 예쁜 캡션을 위한 팁
• 첫 문장은 '훅' — 감정을 자극하거나 질문형으로 (스크롤 멈추게)
• 짧고 구체적으로 (장소·메뉴·분위기 키워드)
• 한 문장에 하나의 메시지만`

// 글자수 제한 (사진 장수 × 45자, 화면당 2줄 기준)
const CHARS_PER_PHOTO = 45

// 캡션에서 섹션 추출
function extractSection(captionText, section) {
  if (!captionText) return ''
  const sectionMap = {
    titleLine1: '[주제목-라인1]',
    titleLine2: '[주제목-라인2]',
    ko: '[설명글-한국어]',
    en: '[설명글-영어]',
    zh: '[설명글-중국어]',
    ja: '[설명글-일본어]',
  }
  const header = sectionMap[section]
  if (!header) return ''
  const allHeaders = Object.values(sectionMap)
  const lines = captionText.split('\n')
  let collecting = false
  const result = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === header) { collecting = true; continue }
    // 다른 섹션 헤더 나오면 즉시 종료
    if (allHeaders.includes(trimmed) && collecting) break
    if (collecting && trimmed) {
      result.push(trimmed.replace(/[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/g, '').trim())
    }
  }
  return result.join(' ').trim()
}


async function buildVideo({ imgs, koText, subText, bgmType, topTag, isPortrait, onProgress }) {
  const W = isPortrait ? 1080 : 1920
  const H = isPortrait ? 1920 : 1080
  const PER_IMG = 3000
  const FPS = 24
  // 세로: 하단 360px 안전영역(틱톡 UI), 가로: 더 작게
  const SAFE_BOTTOM = isPortrait ? 380 : 100
  const CROSSFADE_MS = 400

  // ── 폰트 스타일 5종 (세련된 산세리프 조합, jurere_sister 느낌) ──
  // 세로/가로 각각 최적 크기
  const titleFS1 = isPortrait ? 110 : 72   // JEJU 영문 대제목
  const titleFS2 = isPortrait ? 54 : 36    // 한글 부제목
  const subFS    = isPortrait ? 44 : 30    // 하단 설명 자막
  const captionFS = isPortrait ? 38 : 26   // 외국어 자막

  const FONT_STYLES = [
    // 스타일 A: 굵고 깔끔 (jurere_sister 기본)
    {
      title1: `italic 900 ${titleFS1}px "Apple SD Gothic Neo","Malgun Gothic",sans-serif`,
      title2: `300 ${titleFS2}px "Apple SD Gothic Neo","Noto Sans KR",sans-serif`,
      cap:    `500 ${subFS}px "Apple SD Gothic Neo","Noto Sans KR",sans-serif`,
      capSub: `400 ${captionFS}px "Apple SD Gothic Neo","Noto Sans KR",sans-serif`,
    },
    // 스타일 B: 얇고 세련된 (럭셔리)
    {
      title1: `italic 800 ${titleFS1}px "Noto Sans KR","Apple SD Gothic Neo",sans-serif`,
      title2: `200 ${titleFS2}px "Noto Sans KR","Apple SD Gothic Neo",sans-serif`,
      cap:    `300 ${subFS}px "Noto Sans KR","Apple SD Gothic Neo",sans-serif`,
      capSub: `300 ${captionFS}px "Noto Sans KR","Apple SD Gothic Neo",sans-serif`,
    },
    // 스타일 C: 두껍고 강한 임팩트
    {
      title1: `900 ${titleFS1}px "Apple SD Gothic Neo","Malgun Gothic",sans-serif`,
      title2: `700 ${titleFS2}px "Apple SD Gothic Neo","Noto Sans KR",sans-serif`,
      cap:    `600 ${subFS}px "Apple SD Gothic Neo","Noto Sans KR",sans-serif`,
      capSub: `500 ${captionFS}px "Apple SD Gothic Neo","Noto Sans KR",sans-serif`,
    },
    // 스타일 D: 이탤릭 경량 (브이로그 감성)
    {
      title1: `italic 700 ${titleFS1}px "Apple SD Gothic Neo",sans-serif`,
      title2: `italic 300 ${titleFS2}px "Apple SD Gothic Neo","Noto Sans KR",sans-serif`,
      cap:    `400 ${subFS}px "Apple SD Gothic Neo","Noto Sans KR",sans-serif`,
      capSub: `300 ${captionFS}px "Apple SD Gothic Neo","Noto Sans KR",sans-serif`,
    },
    // 스타일 E: 미니멀 현대적
    {
      title1: `800 ${titleFS1}px "Malgun Gothic","Apple SD Gothic Neo",sans-serif`,
      title2: `400 ${titleFS2}px "Malgun Gothic","Apple SD Gothic Neo",sans-serif`,
      cap:    `500 ${subFS}px "Malgun Gothic","Apple SD Gothic Neo",sans-serif`,
      capSub: `400 ${captionFS}px "Malgun Gothic","Apple SD Gothic Neo",sans-serif`,
    },
  ]
  const style = FONT_STYLES[Math.floor(Math.random() * FONT_STYLES.length)]

  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d', { willReadFrequently: true })

  // ── BGM ──
  let audioCtx = null, stopBGM = null, audioTrack = null
  if (bgmType && bgmType !== 'none') {
    try {
      const resp = await fetch(bgmType)
      if (!resp.ok) throw new Error('BGM 실패: ' + resp.status)
      const arrayBuf = await resp.arrayBuffer()
      audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const audioBuf = await audioCtx.decodeAudioData(arrayBuf)
      const dest = audioCtx.createMediaStreamDestination()
      const master = audioCtx.createGain()
      master.gain.value = 0.85
      master.connect(dest); master.connect(audioCtx.destination)
      const source = audioCtx.createBufferSource()
      source.buffer = audioBuf; source.loop = true
      source.connect(master); source.start(0)
      stopBGM = () => { try { source.stop() } catch {} }
      audioTrack = dest.stream.getAudioTracks()[0]
    } catch (e) { console.warn('BGM 로드 실패:', e) }
  }

  const videoStream = canvas.captureStream(FPS)
  const tracks = [...videoStream.getVideoTracks(), ...(audioTrack ? [audioTrack] : [])]
  const stream = new MediaStream(tracks)
  const mimeType = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4;codecs=avc1','video/mp4','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm']
    .find(m => MediaRecorder.isTypeSupported(m)) || ''
  const chunks = []
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {})
  recorder.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data) }
  recorder.start(200)

  // ── 텍스트 분할 (문장 단위) ──
  function splitForImages(text, n) {
    if (!text) return Array(n).fill('')
    if (n === 1) return [text.trim()]
    const sentences = text.split(/(?<=[.!?。！？])\s+/).map(s => s.trim()).filter(Boolean)
    if (sentences.length >= n) {
      const result = Array(n).fill('')
      const perChunk = Math.ceil(sentences.length / n)
      for (let i = 0; i < n; i++)
        result[i] = sentences.slice(i * perChunk, (i + 1) * perChunk).join(' ').trim()
      return result
    }
    const words = text.split(/\s+/).filter(Boolean)
    const result = Array(n).fill('')
    const perChunk = Math.ceil(words.length / n)
    for (let i = 0; i < n; i++)
      result[i] = words.slice(i * perChunk, (i + 1) * perChunk).join(' ').trim()
    return result
  }
  const koChunks = splitForImages(koText, imgs.length)
  const subChunks = splitForImages(subText, imgs.length)

  // ── 줄바꿈 헬퍼 (maxW 엄격 적용) ──
  function wrapText(text, font, maxW) {
    ctx.font = font
    const lines = []; let line = ''
    for (const ch of text) {
      const test = line + ch
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = ch }
      else line = test
    }
    if (line) lines.push(line)
    return lines.slice(0, 2)
  }

  // ── 텍스트 그리기 헬퍼 ──
  function drawTextLine(text, font, color, x, y, align = 'center') {
    ctx.save()
    ctx.font = font
    ctx.fillStyle = color
    ctx.textAlign = align
    ctx.textBaseline = 'middle'
    ctx.fillText(text, x, y)
    ctx.restore()
  }

  // ── 주제목 그리기: 세로/가로 각각 최적 레이아웃 ──
  function drawTitle(alpha) {
    if (!topTag) return
    const parts = topTag.split('\n').filter(Boolean)
    const line1 = parts[0] || ''   // 영문 대제목 (JEJU)
    const line2 = parts[1] || ''   // 한글 부제목 (천국같은 오션뷰 카페)

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    if (isPortrait) {
      // ── 세로 영상: 화면 상단 30% 영역에 배치 ──
      const areaTop = H * 0.10
      const areaH   = H * 0.28

      ctx.shadowColor = 'rgba(0,0,0,0.9)'
      ctx.shadowBlur = 28
      ctx.shadowOffsetY = 4

      let curY = areaTop + areaH * 0.35
      if (line1) {
        ctx.font = style.title1
        ctx.fillStyle = '#FFFFFF'
        ctx.letterSpacing = '6px'
        // 최대 너비 초과 시 자동 축소
        const maxW1 = W - 80
        let fs = titleFS1
        ctx.font = style.title1
        while (ctx.measureText(line1).width > maxW1 && fs > 40) {
          fs -= 4
          ctx.font = style.title1.replace(`${titleFS1}px`, `${fs}px`)
        }
        ctx.fillText(line1, W / 2, curY)
        curY += fs * 1.15
      }
      if (line2) {
        ctx.letterSpacing = '2px'
        ctx.shadowBlur = 20
        const maxW2 = W - 100
        let fs2 = titleFS2
        ctx.font = style.title2
        while (ctx.measureText(line2).width > maxW2 && fs2 > 24) {
          fs2 -= 2
          ctx.font = style.title2.replace(`${titleFS2}px`, `${fs2}px`)
        }
        ctx.fillStyle = 'rgba(255,255,255,0.88)'
        ctx.fillText(line2, W / 2, curY)
      }
    } else {
      // ── 가로 영상: 왼쪽 1/3 영역에 수직 중앙 배치 ──
      const areaX = W * 0.08
      const areaW = W * 0.42
      ctx.textAlign = 'left'
      ctx.shadowColor = 'rgba(0,0,0,0.9)'
      ctx.shadowBlur = 20
      ctx.shadowOffsetY = 3

      let curY = H / 2 - (line1 && line2 ? titleFS1 * 0.6 : 0)
      if (line1) {
        let fs = titleFS1
        ctx.font = style.title1
        while (ctx.measureText(line1).width > areaW && fs > 32) {
          fs -= 4
          ctx.font = style.title1.replace(`${titleFS1}px`, `${fs}px`)
        }
        ctx.fillStyle = '#FFFFFF'
        ctx.letterSpacing = '4px'
        ctx.fillText(line1, areaX, curY)
        curY += fs * 1.2
      }
      if (line2) {
        let fs2 = titleFS2
        ctx.font = style.title2
        while (ctx.measureText(line2).width > areaW && fs2 > 18) {
          fs2 -= 2
          ctx.font = style.title2.replace(`${titleFS2}px`, `${fs2}px`)
        }
        ctx.fillStyle = 'rgba(255,255,255,0.88)'
        ctx.letterSpacing = '1px'
        ctx.fillText(line2, areaX, curY)
      }
    }
    ctx.letterSpacing = '0px'
    ctx.restore()
  }

  // ── 사진 드로우 헬퍼 ──
  function drawImgFrame(img, t, alpha) {
    const scale = 1 + t * 0.05
    const iw = img.naturalWidth || img.width
    const ih = img.naturalHeight || img.height
    const ratio = Math.max(W / iw, H / ih)
    const dw = iw * ratio * scale; const dh = ih * ratio * scale
    const panDir = (imgs.indexOf(img) % 2 === 0) ? 1 : -1
    const dx = (W - dw) / 2 + panDir * (dw - W) * t * 0.025
    const dy = (H - dh) / 2
    ctx.globalAlpha = alpha
    ctx.drawImage(img, dx, dy, dw, dh)
    ctx.globalAlpha = 1
  }

  const TOTAL_MS = imgs.length * PER_IMG

  for (let i = 0; i < imgs.length; i++) {
    const img = imgs[i]
    const nextImg = imgs[i + 1] || null
    const koLine = koChunks[i] || ''
    const subLine = subChunks[i] || ''
    const frameStart = performance.now()

    await new Promise(resolve => {
      const drawFrame = () => {
        const elapsed = performance.now() - frameStart
        const t = Math.min(elapsed / PER_IMG, 1)

        ctx.fillStyle = '#111'; ctx.fillRect(0, 0, W, H)

        // 크로스페이드
        const crossStart = PER_IMG - CROSSFADE_MS
        if (nextImg && elapsed > crossStart) {
          const cf = Math.min(1, (elapsed - crossStart) / CROSSFADE_MS)
          drawImgFrame(img, t, 1 - cf)
          drawImgFrame(nextImg, 0, cf)
        } else {
          drawImgFrame(img, t, 1)
        }

        if (isPortrait) {
          // 세로: 상단 그라디언트(주제목용) + 하단 그라디언트(자막용)
          const topGrad = ctx.createLinearGradient(0, 0, 0, H * 0.45)
          topGrad.addColorStop(0, 'rgba(0,0,0,0.6)')
          topGrad.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.fillStyle = topGrad; ctx.fillRect(0, 0, W, H)
        } else {
          // 가로: 왼쪽 그라디언트(주제목용) + 하단 그라디언트(자막용)
          const leftGrad = ctx.createLinearGradient(0, 0, W * 0.55, 0)
          leftGrad.addColorStop(0, 'rgba(0,0,0,0.65)')
          leftGrad.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.fillStyle = leftGrad; ctx.fillRect(0, 0, W, H)
        }
        const botGrad = ctx.createLinearGradient(0, H * 0.62, 0, H)
        botGrad.addColorStop(0, 'rgba(0,0,0,0)')
        botGrad.addColorStop(1, 'rgba(0,0,0,0.85)')
        ctx.fillStyle = botGrad; ctx.fillRect(0, 0, W, H)

        const fadeIn  = Math.min(1, elapsed / 250)
        const fadeOut = elapsed > PER_IMG - 400 ? Math.max(0, (PER_IMG - elapsed) / 400) : 1
        const alpha   = fadeIn * fadeOut

        // 주제목
        drawTitle(alpha)

        // 하단 자막 (세로/가로 폰트 크기 다름)
        const maxW = W - (isPortrait ? 120 : 200)
        const koLines  = koLine  ? wrapText(koLine,  style.cap,    maxW) : []
        const subLines = subLine ? wrapText(subLine, style.capSub, maxW) : []
        const koLh  = subFS + 14
        const subLh = captionFS + 10

        ctx.save()
        ctx.globalAlpha = alpha
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        ctx.shadowColor = 'rgba(0,0,0,1)'
        ctx.shadowBlur = isPortrait ? 18 : 12
        ctx.shadowOffsetY = isPortrait ? 3 : 2

        let y = H - SAFE_BOTTOM

        if (subLines.length) {
          ctx.font = style.capSub; ctx.fillStyle = '#C8E6FF'
          for (let li = subLines.length - 1; li >= 0; li--) {
            ctx.fillText(subLines[li], W / 2, y); y -= subLh
          }
          y -= isPortrait ? 16 : 10
        }
        if (koLines.length) {
          ctx.font = style.cap; ctx.fillStyle = '#FFFFFF'
          for (let li = koLines.length - 1; li >= 0; li--) {
            ctx.fillText(koLines[li], W / 2, y); y -= koLh
          }
        }
        ctx.restore()

        const progress = ((i * PER_IMG + elapsed) / TOTAL_MS) * 88
        onProgress(Math.min(progress, 88))
        if (elapsed < PER_IMG) requestAnimationFrame(drawFrame)
        else resolve()
      }
      requestAnimationFrame(drawFrame)
    })
  }

  await new Promise(resolve => {
    let alpha = 0
    const fade = () => {
      alpha = Math.min(alpha + 0.04, 1)
      ctx.fillStyle = `rgba(0,0,0,${alpha})`; ctx.fillRect(0, 0, W, H)
      if (alpha < 1) requestAnimationFrame(fade)
      else resolve()
    }
    requestAnimationFrame(fade)
  })

  if (stopBGM) stopBGM()
  recorder.stop()
  onProgress(95)
  await new Promise(resolve => { recorder.onstop = resolve })
  if (audioCtx) audioCtx.close()
  const blob = new Blob(chunks, { type: mimeType || 'video/webm' })
  onProgress(100)
  return blob
}


export default function VideoPage() {
  const router = useRouter()
  const [mode, setMode] = useState(null)
  const [step, setStep] = useState(1)
  const [files, setFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [videoFile, setVideoFile] = useState(null)
  const [videoPreview, setVideoPreview] = useState(null)

  // 캡션 방식: 'ai' | 'prompt' | 'manual'  (null이면 선택 카드 화면)
  const [captionMode, setCaptionMode] = useState(null)
  const [customPrompt, setCustomPrompt] = useState('')
  const [manualKo, setManualKo] = useState('')      // 직접작성 한국어
  const [manualSub, setManualSub] = useState('')    // 직접작성 외국어
  const [caption, setCaption] = useState('')        // AI 생성 전체 캡션
  const [manualMode, setManualMode] = useState(false) // 직접작성 영상인지 표시
  const [captionLoading, setCaptionLoading] = useState(false)

  const [subLang, setSubLang] = useState('en')      // 보조 언어 (한국어는 고정)
  const [selectedBGM, setSelectedBGM] = useState('auto')
  const [titleText, setTitleText] = useState('')      // 화면 중앙 주제목
  const [selectedPlatforms, setSelectedPlatforms] = useState(['youtube_shorts'])
  const [generating, setGenerating] = useState(false)
  const [genProgress, setGenProgress] = useState(0)
  const [genMsg, setGenMsg] = useState('')
  const [genError, setGenError] = useState('')
  const [videos, setVideos] = useState({ portrait: null, landscape: null })
  const [uploading, setUploading] = useState(false)
  const [uploadResults, setUploadResults] = useState([])
  const photoRef = useRef()
  const videoRef = useRef()

  // 직접작성 글자수 한도 (사진 장수 기준)
  const charLimit = Math.max(1, files.length) * CHARS_PER_PHOTO

  const handlePhotos = e => {
    const sel = Array.from(e.target.files)
    setFiles(p => [...p, ...sel])
    setPreviews(p => [...p, ...sel.map(f => URL.createObjectURL(f))])
  }
  const handleVideo = e => {
    const f = e.target.files[0]; if (!f) return
    setVideoFile(f); setVideoPreview(URL.createObjectURL(f))
  }
  const togglePlatform = id => setSelectedPlatforms(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])

  // AI 자동생성 (가게정보 기반)
  const runAICaption = async (prompt) => {
    setManualMode(false)
    setCaptionLoading(true); setStep(2)
    try {
      const s = await (await fetch('/api/shop')).json()
      const body = { shopName: s.shop_name, shopLocation: s.shop_location, shopType: s.shop_type, subLang }
      if (prompt) body.customPrompt = prompt
      const d = await (await fetch('/api/caption', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })).json()
      setCaption(d.result || '')
    } catch { setCaption('') }
    setCaptionLoading(false)
  }

  // 직접작성 → step2로 (영상 생성 단계)
  const goManual = () => {
    setManualMode(true)
    setCaption('')  // AI 캡션 없음
    setStep(2)
  }

  const handleGenerate = async () => {
    if (!files.length) return
    setGenerating(true); setGenProgress(0); setGenError('')
    try {
      // ── 텍스트 결정 ──
      let koText, subText, titleLine1, titleLine2
      if (manualMode) {
        koText = manualKo
        subText = manualSub
        const parts = (titleText || '').split('\n').filter(Boolean)
        titleLine1 = parts[0] || ''
        titleLine2 = parts[1] || ''
      } else {
        titleLine1 = titleText
          ? titleText.split('\n')[0] || ''
          : extractSection(caption, 'titleLine1') || ''
        titleLine2 = titleText
          ? titleText.split('\n')[1] || ''
          : extractSection(caption, 'titleLine2') || ''
        koText  = extractSection(caption, 'ko') || ''
        subText = extractSection(caption, subLang) || ''
      }

      // ── BGM URL 결정 ──
      let bgmUrl = null
      if (selectedBGM === 'none') {
        bgmUrl = null
      } else if (selectedBGM === 'auto') {
        setGenMsg('🎵 사진 분위기 분석 중...')
        try {
          const res = await fetch('/api/analyze-bgm', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrls: previews.slice(0, 1) })
          })
          const data = await res.json()
          bgmUrl = data.bgmUrl
          setGenMsg(`🎵 BGM: ${data.tag || 'cafe'} 무드`)
        } catch {
          const fallbacks = ['bgm-cafe.mp3', 'bgm-cafe1.mp3', 'bgm-cafe2.mp3', 'bgm-cafe3.mp3']
          const f = fallbacks[Math.floor(Math.random() * fallbacks.length)]
          bgmUrl = `https://hjvgekdeqqgxawefrzlk.supabase.co/storage/v1/object/public/BGM/${f}`
        }
      } else {
        const bgmFiles = BGM_FILES[selectedBGM] || BGM_FILES.cafe
        const picked = bgmFiles[Math.floor(Math.random() * bgmFiles.length)]
        bgmUrl = `https://hjvgekdeqqgxawefrzlk.supabase.co/storage/v1/object/public/BGM/${picked}`
      }

      // ── 이미지를 base64로 변환 ──
      setGenMsg('🖼️ 이미지 준비 중...')
      setGenProgress(5)
      const imageDataUrls = await Promise.all(
        previews.map(src => new Promise((resolve, reject) => {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => {
            const canvas = document.createElement('canvas')
            // Cloudinary 업로드용: 최대 1200px, JPEG 0.80 (용량 최소화)
            const maxSize = 1200
            let w = img.naturalWidth, h = img.naturalHeight
            if (w > maxSize || h > maxSize) {
              const ratio = Math.min(maxSize / w, maxSize / h)
              w = Math.round(w * ratio); h = Math.round(h * ratio)
            }
            canvas.width = w; canvas.height = h
            canvas.getContext('2d').drawImage(img, 0, 0, w, h)
            resolve(canvas.toDataURL('image/jpeg', 0.80))
          }
          img.onerror = reject
          img.src = src
        }))
      )
      setGenProgress(15)

      const ratios = selectedPlatforms.map(pid => PLATFORMS.find(p => p.id === pid)?.ratio)
      const needPortrait  = ratios.includes('portrait')
      const needLandscape = ratios.includes('landscape')
      const fontStyle = Math.floor(Math.random() * 5)
      const result = {}

      // ── Cloudinary 서버사이드 영상 생성 ──
      if (needPortrait) {
        setGenMsg('📱 세로 영상 서버에서 제작 중... (30초~1분 소요)')
        setGenProgress(20)
        const res = await fetch('/api/video/generate', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageDataUrls, koText, subText, titleLine1, titleLine2,
            bgmUrl, isPortrait: true, fontStyle,
          })
        })
        const data = await res.json()
        if (!data.ok) throw new Error(data.error || '세로 영상 생성 실패')
        result.portrait = { url: data.videoUrl, blob: null }
        setGenProgress(needLandscape ? 55 : 90)
      }

      if (needLandscape) {
        setGenMsg('🖥️ 가로 영상 서버에서 제작 중...')
        setGenProgress(needPortrait ? 60 : 20)
        const res = await fetch('/api/video/generate', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageDataUrls, koText, subText, titleLine1, titleLine2,
            bgmUrl, isPortrait: false, fontStyle,
          })
        })
        const data = await res.json()
        if (!data.ok) throw new Error(data.error || '가로 영상 생성 실패')
        result.landscape = { url: data.videoUrl, blob: null }
        setGenProgress(90)
      }

      setGenProgress(100)
      setVideos(result)
      setStep(3)
    } catch (e) {
      console.error(e)
      setGenError('영상 생성 중 오류: ' + e.message)
    }
    setGenerating(false)
  }

  const handleUpload = async () => {
    setUploading(true)
    const results = []
    for (const pid of selectedPlatforms) {
      const platform = PLATFORMS.find(p => p.id === pid)
      const videoData = videos[platform.ratio]

      if (pid === 'instagram') {
        results.push({ platform: pid, status: '⏳ 심사 후 업로드 예정' }); continue
      }

      let blob = videoData?.blob || videoFile
      if (!blob && videoData?.url) {
        try {
          const resp = await fetch(videoData.url)
          blob = await resp.blob()
        } catch {
          results.push({ platform: pid, status: '❌ 영상 다운로드 실패' }); continue
        }
      }
      if (!blob) { results.push({ platform: pid, status: '❌ 파일 없음' }); continue }

      const form = new FormData()
      const isShorts = platform.ratio === 'portrait'
      const uploadCaption = manualMode ? `${manualKo}\n${manualSub}` : caption
      form.append('video', blob, `gorang-${platform.ratio}.mp4`)
      form.append('caption', uploadCaption)
      form.append('title', `고랑AI - ${platform.ratio === 'portrait' ? '세로' : '가로'} - ${new Date().toLocaleDateString('ko')}`)
      form.append('isShorts', isShorts ? 'true' : 'false')

      try {
        const endpoint = pid === 'tiktok' ? '/api/upload/tiktok' : '/api/upload/youtube'
        const data = await (await fetch(endpoint, { method: 'POST', body: form })).json()
        const url = pid === 'tiktok'
          ? (data.ok ? '틱톡 앱에서 비공개로 확인' : undefined)
          : data.youtubeUrl
        results.push({
          platform: pid,
          status: data.ok ? '✅ 업로드 완료' : `❌ 실패 (${data.detail || data.error || ''})`,
          url,
        })
      } catch { results.push({ platform: pid, status: '❌ 네트워크 오류' }) }
    }
    setUploadResults(results)
    setUploading(false)
    setStep(4)
  }

  const reset = () => {
    setStep(1); setMode(null); setFiles([]); setPreviews([])
    setCaption(''); setVideos({ portrait: null, landscape: null })
    setVideoFile(null); setVideoPreview(null); setUploadResults([])
    setGenError(''); setGenProgress(0); setCaptionMode(null)
    setCustomPrompt(''); setManualKo(''); setManualSub(''); setManualMode(false)
  }

  const goBackToCaptionSelect = () => {
    setCaptionMode(null); setCustomPrompt('')
  }

  // ── step 4: 완료 ──
  if (step === 4) return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', padding:'32px 24px', alignItems:'center' }}>
      <div style={{ fontSize:40, marginBottom:12 }}>🎉</div>
      <div style={{ fontSize:20, fontWeight:700, color:'#1A2421', marginBottom:16 }}>완료!</div>
      {uploadResults.map((r, i) => {
        const p = PLATFORMS.find(x => x.id === r.platform)
        return (
          <div key={i} style={{ width:'100%', background:'#F4F6F5', borderRadius:12, padding:'12px 14px', marginBottom:8 }}>
            <div style={{ fontSize:13, fontWeight:600 }}>{p?.icon} {p?.name}</div>
            <div style={{ fontSize:12, color: r.status.includes('✅') ? '#1D9E75' : '#EF9F27', marginTop:3 }}>{r.status}</div>
            {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ fontSize:11, color:'#1D9E75', display:'block', marginTop:3 }}>▶️ 유튜브에서 보기</a>}
          </div>
        )
      })}
      <PrimaryBtn onClick={reset} style={{ marginTop:16, width:'100%' }}>+ 새 영상 만들기</PrimaryBtn>
      <GhostBtn onClick={() => router.push('/home')} style={{ marginTop:8, width:'100%' }}>홈으로</GhostBtn>
    </div>
  )

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
      <TopBar title="영상 만들기" sub={!mode ? '제작 방식 선택' : step===1 ? '설정' : step===2 ? (manualMode ? '캡션 작성' : '캡션 확인') : '미리보기'} />
      <div style={{ flex:1, padding:'0 18px 24px', overflowY:'auto' }}>

        {/* ── 제작 방식 선택 ── */}
        {!mode && (
          <>
            {[
              { id:'photos',   emoji:'📸', title:'사진으로 영상 만들기', sub:'사진 여러 장 → BGM + 자막 + 영상 자동 제작' },
              { id:'existing', emoji:'🎬', title:'내 영상 올리기',        sub:'직접 만든 영상을 업로드' },
            ].map(m => (
              <div key={m.id} onClick={() => setMode(m.id)}
                style={{ border:'1.5px solid #E6EAE8', borderRadius:14, padding:'16px', marginBottom:10, cursor:'pointer', display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ fontSize:30 }}>{m.emoji}</div>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:'#1A2421' }}>{m.title}</div>
                  <div style={{ fontSize:11, color:'#6B7875', marginTop:2 }}>{m.sub}</div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── step 1: 설정 + 캡션 방식 ── */}
        {mode && step === 1 && captionMode === null && (
          <>
            {mode === 'photos' && (
              <>
                <input ref={photoRef} type="file" accept="image/*" multiple style={{ display:'none' }} onChange={handlePhotos} />
                <div onClick={() => photoRef.current.click()}
                  style={{ border:'2px dashed #B0BAB6', borderRadius:14, padding:'18px', textAlign:'center', marginBottom:12, cursor:'pointer', background:'#F4F6F5' }}>
                  <div style={{ fontSize:26, marginBottom:4 }}>🖼️</div>
                  <div style={{ fontSize:13, color:'#6B7875', fontWeight:600 }}>사진 추가 (여러 장 가능)</div>
                  <div style={{ fontSize:11, color:'#B0BAB6', marginTop:2 }}>JPG, PNG</div>
                </div>
                {previews.length > 0 && (
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6, marginBottom:12 }}>
                    {previews.map((p, i) => (
                      <div key={i} style={{ position:'relative', borderRadius:8, overflow:'hidden', aspectRatio:'1' }}>
                        <img src={p} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt="" />
                        <button onClick={() => { setFiles(f=>f.filter((_,j)=>j!==i)); setPreviews(pv=>pv.filter((_,j)=>j!==i)) }}
                          style={{ position:'absolute', top:2, right:2, width:18, height:18, borderRadius:'50%', background:'rgba(0,0,0,.65)', color:'#fff', border:'none', cursor:'pointer', fontSize:10, lineHeight:'18px', textAlign:'center' }}>✕</button>
                      </div>
                    ))}
                    <div onClick={() => photoRef.current.click()}
                      style={{ borderRadius:8, border:'2px dashed #B0BAB6', display:'flex', alignItems:'center', justifyContent:'center', aspectRatio:'1', cursor:'pointer', background:'#F4F6F5' }}>
                      <span style={{ fontSize:18, color:'#B0BAB6' }}>+</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {mode === 'existing' && (
              <>
                <input ref={videoRef} type="file" accept="video/*" style={{ display:'none' }} onChange={handleVideo} />
                <div onClick={() => videoRef.current.click()}
                  style={{ border:'2px dashed #B0BAB6', borderRadius:14, padding:'18px', textAlign:'center', marginBottom:12, cursor:'pointer', background:'#F4F6F5' }}>
                  {videoPreview
                    ? <video src={videoPreview} style={{ width:'100%', borderRadius:8, maxHeight:160, objectFit:'cover' }} controls />
                    : <><div style={{ fontSize:26, marginBottom:4 }}>🎬</div><div style={{ fontSize:13, color:'#6B7875', fontWeight:600 }}>영상 파일 선택</div><div style={{ fontSize:11, color:'#B0BAB6', marginTop:2 }}>MP4, MOV</div></>}
                </div>
              </>
            )}

            {/* 플랫폼 */}
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, color:'#6B7875', fontWeight:500, marginBottom:8 }}>📤 업로드 플랫폼</div>
              {PLATFORMS.map(p => (
                <div key={p.id} onClick={() => togglePlatform(p.id)}
                  style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', marginBottom:6, borderRadius:10, border:`1.5px solid ${selectedPlatforms.includes(p.id)?'#1D9E75':'#E6EAE8'}`, background: selectedPlatforms.includes(p.id)?'#E1F5EE':'#fff', cursor:'pointer' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <input type="checkbox" checked={selectedPlatforms.includes(p.id)} readOnly style={{ width:15, height:15, accentColor:'#1D9E75' }} />
                    <span style={{ fontSize:13, color:'#1A2421', fontWeight:500 }}>{p.icon} {p.name}</span>
                  </div>
                  <span style={{ fontSize:11, color: selectedPlatforms.includes(p.id)?'#0F6E56':'#B0BAB6', fontWeight:600, background: selectedPlatforms.includes(p.id)?'#C8EFE0':'#F4F6F5', padding:'3px 8px', borderRadius:8 }}>
                    {p.ratioLabel}
                  </span>
                </div>
              ))}
            </div>



            {/* BGM */}
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, color:'#6B7875', fontWeight:500, marginBottom:8 }}>🎵 배경음악 (BGM)</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {BGM_LIST.map(b => (
                  <button key={b.id} onClick={() => setSelectedBGM(b.id)}
                    style={{ padding:'6px 12px', borderRadius:20, border:`1.5px solid ${selectedBGM===b.id?'#5DCAA5':'#E6EAE8'}`, background: selectedBGM===b.id?'#E1F5EE':'#fff', color: selectedBGM===b.id?'#0F6E56':'#6B7875', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'Noto Sans KR, sans-serif' }}>
                    {b.name}
                  </button>
                ))}
              </div>
            </div>


            {/* 자막 언어 — 한국어 고정 + 1개 선택 */}
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:11, color:'#6B7875', fontWeight:500, marginBottom:8 }}>💬 자막 언어 <span style={{ color:'#B0BAB6' }}>(한국어 + 1개)</span></div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, alignItems:'center' }}>
                <span style={{ padding:'6px 12px', borderRadius:20, background:'#1D9E75', color:'#fff', fontSize:12, fontWeight:600 }}>🇰🇷 한국어 (필수)</span>
                <span style={{ color:'#B0BAB6', fontSize:13 }}>+</span>
                {SUB_LANG.map(l => (
                  <button key={l.code} onClick={() => setSubLang(l.code)}
                    style={{ padding:'6px 12px', borderRadius:20, border:`1.5px solid ${subLang===l.code?'#5DCAA5':'#E6EAE8'}`, background: subLang===l.code?'#E1F5EE':'#fff', color: subLang===l.code?'#0F6E56':'#6B7875', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'Noto Sans KR, sans-serif' }}>
                    {l.flag} {l.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 캡션 방식 카드 */}
            <div style={{ marginBottom:8 }}>
              <div style={{ fontSize:11, color:'#6B7875', fontWeight:500, marginBottom:8 }}>✦ 캡션 방식 선택</div>
              {[
                { id:'ai',     emoji:'🤖', title:'AI 자동생성',         sub:'가게 정보로 AI가 알아서 작성' },
                { id:'prompt', emoji:'💡', title:'프롬프트로 캡션 만들기', sub:'원하는 방향을 입력하면 AI가 맞춰서 생성' },
                { id:'manual', emoji:'✏️', title:'설명문구 직접 쓰기',     sub:'내가 쓴 문구 그대로 자막으로' },
              ].map(c => (
                <div key={c.id} onClick={() => {
                    if (c.id === 'ai') { runAICaption(null) }
                    else { setCaptionMode(c.id) }
                  }}
                  style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 14px', marginBottom:8, borderRadius:12, border:'1.5px solid #E6EAE8', background:'#fff', cursor: (mode==='photos'?!files.length:!videoFile) ? 'not-allowed' : 'pointer', opacity: (mode==='photos'?!files.length:!videoFile) ? 0.5 : 1, pointerEvents: (mode==='photos'?!files.length:!videoFile) ? 'none' : 'auto' }}>
                  <div style={{ fontSize:24 }}>{c.emoji}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13.5, fontWeight:700, color:'#1A2421' }}>{c.title}</div>
                    <div style={{ fontSize:11, color:'#6B7875', marginTop:1 }}>{c.sub}</div>
                  </div>
                  <span style={{ color:'#B0BAB6', fontSize:18 }}>›</span>
                </div>
              ))}
              {(mode==='photos'?!files.length:!videoFile) && (
                <div style={{ fontSize:11, color:'#EF9F27', textAlign:'center', marginTop:4 }}>
                  ↑ 먼저 {mode==='photos' ? '사진을' : '영상을'} 추가해주세요
                </div>
              )}
            </div>

            <GhostBtn onClick={() => setMode(null)} style={{ marginTop:8 }}>← 돌아가기</GhostBtn>
          </>
        )}

        {/* ── step 1 하위: 프롬프트 작성 페이지 ── */}
        {mode && step === 1 && captionMode === 'prompt' && (
          <>
            <div style={{ background:'#F4F6F5', borderRadius:12, padding:'12px 14px', marginBottom:14, fontSize:11.5, color:'#3A4744', whiteSpace:'pre-line', lineHeight:1.6 }}>
              {SUB_INFO}
            </div>

            <div style={{ fontSize:12, fontWeight:600, color:'#1A2421', marginBottom:8 }}>💡 어떤 캡션을 원하세요?</div>
            <textarea
              value={customPrompt}
              onChange={e => setCustomPrompt(e.target.value)}
              placeholder="예) 서귀포 모슬포항 오션뷰가 보이는 카페야. 오션뷰랑 카페 분위기가 부각되게 캡션 만들어줘"
              style={{ width:'100%', minHeight:100, padding:'12px', borderRadius:10, border:'1.5px solid #5DCAA5', fontSize:13, color:'#1A2421', fontFamily:'Noto Sans KR, sans-serif', resize:'vertical', boxSizing:'border-box', outline:'none', lineHeight:1.5 }}
            />

            <div style={{ fontSize:11, color:'#6B7875', fontWeight:500, margin:'16px 0 8px' }}>✨ 예시 프롬프트 (탭하면 채워져요)</div>
            {PROMPT_EXAMPLES.map((ex, i) => (
              <div key={i} onClick={() => setCustomPrompt(ex.text)}
                style={{ border:'1px solid #E6EAE8', borderRadius:10, padding:'10px 12px', marginBottom:6, cursor:'pointer', background:'#fff' }}>
                <div style={{ fontSize:12, fontWeight:600, color:'#0F6E56', marginBottom:3 }}>{ex.title}</div>
                <div style={{ fontSize:11, color:'#6B7875', lineHeight:1.4 }}>{ex.text}</div>
              </div>
            ))}

            <PrimaryBtn onClick={() => runAICaption(customPrompt)} disabled={!customPrompt.trim()} style={{ marginTop:14 }}>
              💡 이 프롬프트로 캡션 생성하기
            </PrimaryBtn>
            <GhostBtn onClick={goBackToCaptionSelect} style={{ marginTop:8 }}>← 캡션 방식 다시 선택</GhostBtn>
          </>
        )}

        {/* ── step 1 하위: 직접 작성 페이지 ── */}
        {mode && step === 1 && captionMode === 'manual' && (
          <>
            <div style={{ background:'#F4F6F5', borderRadius:12, padding:'12px 14px', marginBottom:14, fontSize:11.5, color:'#3A4744', lineHeight:1.6 }}>
              ✏️ 주제목은 화면 중앙 큰 글씨, 설명글은 하단 자막으로 들어가요.
            </div>

            {/* 주제목 */}
            <div style={{ fontSize:12, fontWeight:600, color:'#1A2421', marginBottom:6 }}>🎬 주제목 (화면 중앙)</div>
            <textarea
              value={titleText}
              onChange={e => setTitleText(e.target.value)}
              placeholder={"1줄: JEJU CAFE\n2줄: 천국같은 에메랄드빛 오션뷰 카페"}
              style={{ width:'100%', minHeight:70, padding:'10px 12px', borderRadius:10, border:'1.5px solid #5DCAA5', fontSize:13, color:'#1A2421', fontFamily:'Noto Sans KR, sans-serif', boxSizing:'border-box', outline:'none', marginBottom:4, resize:'none', lineHeight:1.6 }}
            />
            <div style={{ fontSize:11, color:'#B0BAB6', marginBottom:10 }}>↵ 엔터로 줄 구분 — 1줄: 영문 제목 / 2줄: 한국어 설명</div>

            {/* 설명글 */}
            <div style={{ fontSize:12, fontWeight:600, color:'#1A2421', marginBottom:6 }}>🇰🇷 설명글 (하단 자막)</div>
            <textarea
              value={manualKo}
              onChange={e => { if (e.target.value.length <= charLimit) setManualKo(e.target.value) }}
              placeholder="예) 바다가 보이는 그 카페, 오늘도 당신을 기다려요"
              style={{ width:'100%', minHeight:70, padding:'12px', borderRadius:10, border:'1.5px solid #5DCAA5', fontSize:13, color:'#1A2421', fontFamily:'Noto Sans KR, sans-serif', resize:'vertical', boxSizing:'border-box', outline:'none', lineHeight:1.5 }}
            />
            <div style={{ fontSize:11, color: manualKo.length >= charLimit ? '#EF9F27' : '#B0BAB6', textAlign:'right', marginTop:3 }}>
              {manualKo.length} / {charLimit}자
            </div>

            <div style={{ fontSize:12, fontWeight:600, color:'#1A2421', margin:'14px 0 6px' }}>
              {SUB_LANG.find(l => l.code === subLang)?.flag} {SUB_LANG.find(l => l.code === subLang)?.name} 자막 <span style={{ color:'#B0BAB6', fontWeight:400 }}>(선택)</span>
            </div>
            <textarea
              value={manualSub}
              onChange={e => { if (e.target.value.length <= charLimit) setManualSub(e.target.value) }}
              placeholder="외국어 자막을 직접 입력 (비워두면 한국어만 표시)"
              style={{ width:'100%', minHeight:70, padding:'12px', borderRadius:10, border:'1.5px solid #E6EAE8', fontSize:13, color:'#1A2421', fontFamily:'Noto Sans KR, sans-serif', resize:'vertical', boxSizing:'border-box', outline:'none', lineHeight:1.5 }}
            />
            <div style={{ fontSize:11, color: manualSub.length >= charLimit ? '#EF9F27' : '#B0BAB6', textAlign:'right', marginTop:3 }}>
              {manualSub.length} / {charLimit}자
            </div>

            <PrimaryBtn onClick={goManual} disabled={!manualKo.trim()} style={{ marginTop:14 }}>
              ✏️ 작성 완료 → 영상 만들기
            </PrimaryBtn>
            <GhostBtn onClick={goBackToCaptionSelect} style={{ marginTop:8 }}>← 캡션 방식 다시 선택</GhostBtn>
          </>
        )}

        {/* ── step 2: 캡션 확인(AI) / 영상 만들기 ── */}
        {step === 2 && (
          <>
            {!manualMode && (captionLoading
              ? <div style={{ background:'#E1F5EE', borderRadius:14, padding:16, border:'1.5px solid #5DCAA5', marginBottom:12 }}>
                  <div style={{ fontSize:10, color:'#0F6E56', fontWeight:700, marginBottom:8 }}>✦ AI 캡션 생성 중...</div>
                  <LoadingDots />
                </div>
              : <>
                  <div style={{ background:'#E1F5EE', borderRadius:14, padding:16, border:'1.5px solid #5DCAA5', marginBottom:12 }}>
                    <div style={{ fontSize:10, color:'#0F6E56', fontWeight:700, marginBottom:12 }}>✦ AI 생성 캡션</div>

                    {/* 주제목 */}
                    <div style={{ marginBottom:12 }}>
                      <div style={{ fontSize:11, color:'#6B7875', fontWeight:600, marginBottom:4 }}>🎬 주제목 (화면 중앙)</div>
                      <div style={{ fontSize:13, color:'#1A2421', lineHeight:1.7 }}>
                        <span style={{ fontWeight:700 }}>{extractSection(caption, 'titleLine1') || '—'}</span>
                        <br/>
                        <span style={{ color:'#3A4744' }}>{extractSection(caption, 'titleLine2') || '—'}</span>
                      </div>
                      <input
                        value={titleText}
                        onChange={e => setTitleText(e.target.value)}
                        placeholder="직접 수정: JEJU CAFE (엔터) 천국같은 오션뷰 (비우면 AI 생성 사용)"
                        style={{ width:'100%', marginTop:8, padding:'8px 10px', borderRadius:8, border:'1.5px solid #C8EFE0', fontSize:12, color:'#1A2421', fontFamily:'Noto Sans KR, sans-serif', boxSizing:'border-box', outline:'none' }}
                      />
                      <div style={{ fontSize:11, color:'#B0BAB6', marginTop:4 }}>✏️ 수정 시 줄바꿈(↵)으로 2줄 구분 — 예) JEJU↵천국같은 오션뷰 카페</div>
                    </div>

                    {/* 한국어 설명글 */}
                    <div style={{ borderTop:'1px solid rgba(0,0,0,0.06)', paddingTop:10, marginBottom:8 }}>
                      <div style={{ fontSize:11, color:'#6B7875', fontWeight:600, marginBottom:4 }}>🇰🇷 설명글 (하단 자막)</div>
                      <div style={{ fontSize:13, color:'#1A2421', lineHeight:1.6 }}>
                        {extractSection(caption, 'ko') || '한국어 설명글 생성 중...'}
                      </div>
                    </div>

                    {/* 외국어 설명글 */}
                    <div style={{ borderTop:'1px solid rgba(0,0,0,0.06)', paddingTop:10 }}>
                      <div style={{ fontSize:11, color:'#6B7875', fontWeight:600, marginBottom:4 }}>
                        {SUB_LANG.find(l=>l.code===subLang)?.flag} {SUB_LANG.find(l=>l.code===subLang)?.name} 설명글
                      </div>
                      <div style={{ fontSize:13, color:'#3A4744', lineHeight:1.6 }}>
                        {extractSection(caption, subLang) || '외국어 설명글 생성 중...'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display:'flex', gap:8, marginBottom:14 }}>
                    <GhostBtn onClick={() => { setTitleText(''); runAICaption(customPrompt || null) }} style={{ flex:1, padding:'10px', fontSize:12 }}>↻ 다시 생성</GhostBtn>
                    <button onClick={() => { const t = prompt('캡션 전체 수정 (고급):', caption); if(t!==null) setCaption(t) }}
                      style={{ flex:1, padding:10, borderRadius:14, border:'1.5px solid #1D9E75', background:'transparent', color:'#1D9E75', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'Noto Sans KR, sans-serif' }}>
                      ✎ 직접 수정
                    </button>
                  </div>
                </>
            )}

            {manualMode && (
              <div style={{ background:'#E1F5EE', borderRadius:14, padding:16, border:'1.5px solid #5DCAA5', marginBottom:14 }}>
                <div style={{ fontSize:11, color:'#0F6E56', fontWeight:700, marginBottom:8 }}>✏️ 직접 작성한 자막</div>
                {titleText && <div style={{ fontSize:15, color:'#1A2421', fontWeight:700, marginBottom:6 }}>🎬 {titleText}</div>}
                <div style={{ fontSize:13, color:'#1A2421', marginBottom:6 }}>🇰🇷 {manualKo}</div>
                {manualSub && <div style={{ fontSize:13, color:'#3A4744' }}>{SUB_LANG.find(l=>l.code===subLang)?.flag} {manualSub}</div>}
                <GhostBtn onClick={() => { setStep(1); setCaptionMode('manual') }} style={{ marginTop:10, padding:'8px', fontSize:12 }}>✎ 자막 수정</GhostBtn>
              </div>
            )}

            {generating && (
              <div style={{ background:'#E1F5EE', borderRadius:14, padding:16, marginBottom:14, border:'1.5px solid #5DCAA5' }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#0F6E56', marginBottom:6 }}>{genMsg} {Math.round(genProgress)}%</div>
                <div style={{ height:8, background:'rgba(255,255,255,0.5)', borderRadius:4, overflow:'hidden' }}>
                  <div style={{ height:8, background:'#1D9E75', borderRadius:4, width:`${genProgress}%`, transition:'width 0.3s' }} />
                </div>
                <div style={{ fontSize:11, color:'#085041', marginTop:6 }}>브라우저에서 직접 영상을 만들고 있어요 🌿</div>
              </div>
            )}

            {genError && (
              <div style={{ background:'#FCEBEB', borderRadius:12, padding:'12px 14px', marginBottom:14, fontSize:12, color:'#A32D2D' }}>
                ❌ {genError}
              </div>
            )}

            {!generating && !captionLoading && (
              mode === 'photos'
                ? <PrimaryBtn onClick={handleGenerate} disabled={!files.length}>🎬 영상 만들기 시작</PrimaryBtn>
                : <PrimaryBtn onClick={() => setStep(3)}>다음 → 업로드 확인</PrimaryBtn>
            )}
            <GhostBtn onClick={() => { setStep(1); if(!manualMode) setCaptionMode(null) }} style={{ marginTop:8 }}>← 돌아가기</GhostBtn>
          </>
        )}

        {/* ── step 3: 미리보기 + 업로드 ── */}
        {step === 3 && (
          <>
            {videos.portrait && (
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:11, color:'#6B7875', marginBottom:5, fontWeight:500 }}>📱 세로 영상 (9:16)</div>
                <video src={videos.portrait.url} controls playsInline
                  style={{ width:'100%', borderRadius:12, maxHeight:220, objectFit:'contain', background:'#000' }} />
              </div>
            )}
            {videos.landscape && (
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:11, color:'#6B7875', marginBottom:5, fontWeight:500 }}>🖥️ 가로 영상 (16:9)</div>
                <video src={videos.landscape.url} controls playsInline
                  style={{ width:'100%', borderRadius:12, maxHeight:160, objectFit:'contain', background:'#000' }} />
              </div>
            )}
            {videoPreview && !videos.portrait && !videos.landscape && (
              <video src={videoPreview} controls playsInline
                style={{ width:'100%', borderRadius:12, maxHeight:200, objectFit:'cover', marginBottom:12 }} />
            )}

            <div style={{ background:'#F4F6F5', borderRadius:12, padding:'12px 14px', marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#1A2421', marginBottom:8 }}>업로드 채널</div>
              {selectedPlatforms.map(pid => {
                const p = PLATFORMS.find(x => x.id === pid)
                return (
                  <div key={pid} style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'5px 0', borderBottom:'1px solid #E6EAE8' }}>
                    <span>{p?.icon} {p?.name}</span>
                    <span style={{ color:'#6B7875', fontSize:11 }}>{p?.ratioLabel}</span>
                  </div>
                )
              })}
            </div>

            <PrimaryBtn onClick={handleUpload} disabled={uploading}>
              {uploading ? '업로드 중...' : `🚀 ${selectedPlatforms.length}개 채널 업로드`}
            </PrimaryBtn>
            <GhostBtn onClick={() => { setStep(2); setGenProgress(0) }} style={{ marginTop:8 }}>← 영상 다시 만들기</GhostBtn>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
