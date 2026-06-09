'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { BottomNav, TopBar, PrimaryBtn, GhostBtn, AiBox, LoadingDots } from '../../components/ui'

const BGM_LIST = [
  { id: 'none',   name: '🔇 없음' },
  { id: 'calm',   name: '🌊 잔잔한 감성' },
  { id: 'bright', name: '☀️ 밝고 경쾌한' },
  { id: 'jeju',   name: '🌿 제주 자연' },
  { id: 'luxury', name: '✨ 럭셔리' },
]

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

// 캡션에서 언어별 줄 추출
function extractByLang(captionText, langCode) {
  const lines = captionText.split('\n')
  // AI 출력의 모든 헤더 변형 커버 (KR, 🇰🇷, 한국어, Korean 등)
  const markers = {
    ko: ['한국어', '🇰🇷', 'Korean', 'KR'],
    en: ['영어', '🇺🇸', 'English', 'US'],
    ja: ['일본어', '🇯🇵', 'Japanese', 'JP', '日本語'],
    zh: ['중국어', '🇨🇳', 'Chinese', 'CN', '中文'],
  }
  const allMarkers = Object.values(markers).flat()
  const target = markers[langCode] || []

  // 헤더 줄 판별: 모든 언어 마커 중 하나 포함 + 짧은 줄
  const isHeaderLine = (line) =>
    line.length < 60 && allMarkers.some(m => line.includes(m))

  let collecting = false
  const result = []
  for (const line of lines) {
    const isHeader = isHeaderLine(line)
    if (isHeader && target.some(m => line.includes(m))) { collecting = true; continue }
    if (isHeader && collecting) break
    if (collecting && line.trim() && !line.trim().startsWith('#')) {
      result.push(line.replace(/[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/g, '').trim())
    }
  }
  return result.join(' ').trim()
}

async function buildVideo({ imgs, koText, subText, bgmType, isPortrait, onProgress }) {
  const W = isPortrait ? 1080 : 1920
  const H = isPortrait ? 1920 : 1080
  const PER_IMG = 3000
  const FPS = 24
  // 안전영역: 하단 320px(틱톡 기준) 회피 → 자막을 그 위에 배치
  const SAFE_BOTTOM = isPortrait ? 360 : 90

  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d', { willReadFrequently: true })

  let audioCtx = null, stopBGM = null, audioTrack = null
  if (bgmType && bgmType !== 'none') {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const dest = audioCtx.createMediaStreamDestination()
      const master = audioCtx.createGain()
      master.gain.value = 0.18
      master.connect(dest); master.connect(audioCtx.destination)
      const presets = {
        calm:    [{ freq: 220, amp: 0.5 }, { freq: 330, amp: 0.3 }, { freq: 440, amp: 0.2 }],
        bright:  [{ freq: 261, amp: 0.4 }, { freq: 392, amp: 0.4 }, { freq: 523, amp: 0.3 }],
        jeju:    [{ freq: 196, amp: 0.5 }, { freq: 294, amp: 0.3 }, { freq: 370, amp: 0.2 }],
        luxury:  [{ freq: 174, amp: 0.4 }, { freq: 261, amp: 0.3 }, { freq: 349, amp: 0.2 }],
      }
      const oscs = (presets[bgmType] || presets.calm).map(({ freq, amp }) => {
        const osc = audioCtx.createOscillator()
        const g = audioCtx.createGain()
        osc.type = 'sine'; osc.frequency.value = freq; g.gain.value = amp
        osc.connect(g); g.connect(master); osc.start()
        return osc
      })
      stopBGM = () => oscs.forEach(o => { try { o.stop() } catch {} })
      audioTrack = dest.stream.getAudioTracks()[0]
    } catch (e) { console.warn('BGM 생성 실패:', e) }
  }

  const videoStream = canvas.captureStream(FPS)
  const tracks = [...videoStream.getVideoTracks(), ...(audioTrack ? [audioTrack] : [])]
  const stream = new MediaStream(tracks)

  const mimeType = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
    .find(m => MediaRecorder.isTypeSupported(m)) || ''

  const chunks = []
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {})
  recorder.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data) }
  recorder.start(200)

  // 텍스트를 사진 장수만큼 분할 (단어/어절 단위로 잘라서 글자 중간 잘림 방지)
  function splitForImages(text, n) {
    if (!text) return Array(n).fill('')
    if (n === 1) return [text.trim()]
    // 문장 구분자로 먼저 나누기 (마침표, 느낌표, 물음표, 줄바꿈)
    const sentences = text.split(/(?<=[.!?。！？\n])\s*/).map(s => s.trim()).filter(Boolean)
    if (sentences.length >= n) {
      // 문장이 사진 수 이상이면 균등 배분
      const result = Array(n).fill('')
      const perChunk = Math.ceil(sentences.length / n)
      for (let i = 0; i < n; i++) {
        result[i] = sentences.slice(i * perChunk, (i + 1) * perChunk).join(' ').trim()
      }
      return result
    }
    // 문장이 부족하면 공백/어절 단위로 분할
    const words = text.split(/\s+/).filter(Boolean)
    const result = Array(n).fill('')
    const perChunk = Math.ceil(words.length / n)
    for (let i = 0; i < n; i++) {
      result[i] = words.slice(i * perChunk, (i + 1) * perChunk).join(' ').trim()
    }
    return result
  }
  const koChunks = splitForImages(koText, imgs.length)
  const subChunks = splitForImages(subText, imgs.length)

  // 줄바꿈 헬퍼
  function wrapText(text, font, maxW) {
    ctx.font = font
    const lines = []
    let line = ''
    for (const ch of text) {
      const test = line + ch
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = ch }
      else line = test
    }
    if (line) lines.push(line)
    return lines.slice(0, 2)  // 언어당 최대 2줄
  }

  const TOTAL_MS = imgs.length * PER_IMG

  for (let i = 0; i < imgs.length; i++) {
    const img = imgs[i]
    const koLine = koChunks[i] || ''
    const subLine = subChunks[i] || ''
    const frameStart = performance.now()

    await new Promise(resolve => {
      const drawFrame = () => {
        const elapsed = performance.now() - frameStart
        const t = Math.min(elapsed / PER_IMG, 1)
        ctx.fillStyle = '#111'; ctx.fillRect(0, 0, W, H)
        const scale = 1 + t * 0.06
        const iw = img.naturalWidth || img.width
        const ih = img.naturalHeight || img.height
        const ratio = Math.max(W / iw, H / ih)
        const dw = iw * ratio * scale; const dh = ih * ratio * scale
        const dx = (W - dw) / 2 - (dw - W / scale) * t * 0.03
        const dy = (H - dh) / 2
        ctx.drawImage(img, dx, dy, dw, dh)
        const grad = ctx.createLinearGradient(0, H * 0.55, 0, H)
        grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(0,0,0,0.8)')
        ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H)

        const fadeIn  = Math.min(1, elapsed / 600)
        const fadeOut = elapsed > PER_IMG - 600 ? Math.max(0, (PER_IMG - elapsed) / 600) : 1
        const alpha   = fadeIn * fadeOut

        ctx.save(); ctx.globalAlpha = alpha
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
        ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 16

        const koFont  = `bold ${isPortrait ? 52 : 38}px "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`
        const subFont = `600 ${isPortrait ? 40 : 30}px "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`
        const maxW = W - 90

        const koLines  = koLine  ? wrapText(koLine, koFont, maxW) : []
        const subLines = subLine ? wrapText(subLine, subFont, maxW) : []

        const koLh  = (isPortrait ? 52 : 38) + 12
        const subLh = (isPortrait ? 40 : 30) + 10
        const gap = 16

        const totalH = koLines.length * koLh + (subLines.length ? gap + subLines.length * subLh : 0)
        let y = H - SAFE_BOTTOM

        // 아래에서 위로: 외국어(보조) 먼저 그리고 그 위에 한국어
        if (subLines.length) {
          ctx.font = subFont; ctx.fillStyle = '#E8F4FF'
          for (let li = subLines.length - 1; li >= 0; li--) {
            ctx.fillText(subLines[li], W / 2, y)
            y -= subLh
          }
          y -= gap
        }
        if (koLines.length) {
          ctx.font = koFont; ctx.fillStyle = '#fff'
          for (let li = koLines.length - 1; li >= 0; li--) {
            ctx.fillText(koLines[li], W / 2, y)
            y -= koLh
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
  const [selectedBGM, setSelectedBGM] = useState('calm')
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
      const body = { shopName: s.shop_name, shopLocation: s.shop_location, shopType: s.shop_type }
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
      const imgs = await Promise.all(previews.map(src => new Promise((res, rej) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => res(img)
        img.onerror = () => { img.crossOrigin = null; img.src = src; img.onload = () => res(img); img.onerror = rej }
        img.src = src
      })))

      // 자막 텍스트 결정
      let koText, subText
      if (manualMode) {
        koText = manualKo
        subText = manualSub
      } else {
        koText = extractByLang(caption, 'ko') || caption.split('\n').find(l => l.trim() && !l.includes('캡션:'))?.trim() || ''
        subText = extractByLang(caption, subLang)
      }

      const ratios = selectedPlatforms.map(pid => PLATFORMS.find(p => p.id === pid)?.ratio)
      const needPortrait  = ratios.includes('portrait')
      const needLandscape = ratios.includes('landscape')
      const result = {}

      if (needPortrait) {
        setGenMsg('📱 세로 영상 제작 중...')
        const blob = await buildVideo({
          imgs, koText, subText, bgmType: selectedBGM, isPortrait: true,
          onProgress: p => setGenProgress(needLandscape ? p * 0.5 : p)
        })
        result.portrait = { blob, url: URL.createObjectURL(blob) }
      }
      if (needLandscape) {
        setGenMsg('🖥️ 가로 영상 제작 중...')
        const blob = await buildVideo({
          imgs, koText, subText, bgmType: selectedBGM, isPortrait: false,
          onProgress: p => setGenProgress(needPortrait ? 50 + p * 0.5 : p)
        })
        result.landscape = { blob, url: URL.createObjectURL(blob) }
      }

      setVideos(result)
      setStep(3)
    } catch (e) {
      console.error(e)
      setGenError('영상 생성 중 오류가 발생했어요: ' + e.message)
    }
    setGenerating(false)
  }

  const handleUpload = async () => {
    setUploading(true)
    const results = []
    for (const pid of selectedPlatforms) {
      const platform = PLATFORMS.find(p => p.id === pid)
      const blob = videos[platform.ratio]?.blob || videoFile

      if (pid === 'instagram') {
        results.push({ platform: pid, status: '⏳ 심사 후 업로드 예정' }); continue
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
              ✏️ 입력한 문구가 그대로 자막으로 들어가요.<br/>
              화면당 2줄이 깔끔해서 <b>최대 {charLimit}자</b>까지 가능해요 (사진 {Math.max(1,files.length)}장 기준)
            </div>

            <div style={{ fontSize:12, fontWeight:600, color:'#1A2421', marginBottom:6 }}>🇰🇷 한국어 자막</div>
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
                    {/* 한국어 고정 */}
                    <div style={{ marginBottom:10 }}>
                      <div style={{ fontSize:11, color:'#6B7875', fontWeight:600, marginBottom:4 }}>🇰🇷 한국어</div>
                      <div style={{ fontSize:13, color:'#1A2421', lineHeight:1.6 }}>
                        {extractByLang(caption, 'ko') || '한국어 캡션을 불러오는 중...'}
                      </div>
                    </div>
                    {/* 선택한 외국어만 */}
                    <div style={{ borderTop:'1px solid rgba(0,0,0,0.06)', paddingTop:10 }}>
                      <div style={{ fontSize:11, color:'#6B7875', fontWeight:600, marginBottom:4 }}>
                        {SUB_LANG.find(l=>l.code===subLang)?.flag} {SUB_LANG.find(l=>l.code===subLang)?.name}
                      </div>
                      <div style={{ fontSize:13, color:'#3A4744', lineHeight:1.6 }}>
                        {extractByLang(caption, subLang) || `${SUB_LANG.find(l=>l.code===subLang)?.name} 캡션을 불러오는 중...`}
                      </div>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:8, marginBottom:14 }}>
                    <GhostBtn onClick={() => runAICaption(customPrompt || null)} style={{ flex:1, padding:'10px', fontSize:12 }}>↻ 다시 생성</GhostBtn>
                    <button onClick={() => { const t = prompt('캡션 수정:', caption); if(t!==null) setCaption(t) }}
                      style={{ flex:1, padding:10, borderRadius:14, border:'1.5px solid #1D9E75', background:'transparent', color:'#1D9E75', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'Noto Sans KR, sans-serif' }}>
                      ✎ 직접 수정
                    </button>
                  </div>
                </>
            )}

            {manualMode && (
              <div style={{ background:'#E1F5EE', borderRadius:14, padding:16, border:'1.5px solid #5DCAA5', marginBottom:14 }}>
                <div style={{ fontSize:11, color:'#0F6E56', fontWeight:700, marginBottom:8 }}>✏️ 직접 작성한 자막</div>
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
