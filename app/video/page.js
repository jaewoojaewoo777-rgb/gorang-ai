'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
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

const BGM_FILES = {
  ocean:   ['bgm-ocean.mp3', 'bgm-ocean1.mp3'],
  cafe:    ['bgm-cafe.mp3', 'bgm-cafe1.mp3', 'bgm-cafe2.mp3', 'bgm-cafe3.mp3'],
  lofi:    ['bgm-lofi.mp3', 'bgm-lofi1.mp3'],
  luxury:  ['bgm-luxury.mp3', 'bgm-luxury1.mp3'],
  bright:  ['bgm-bright.mp3', 'bgm-bright1.mp3', 'bgm-bright2.mp3', 'bgm-bright3.mp3'],
  night:   ['bgm-night.mp3'],
}

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

const CHARS_PER_PHOTO = 45

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
    if (allHeaders.includes(trimmed) && collecting) break
    if (collecting && trimmed) {
      result.push(trimmed.replace(/[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/g, '').trim())
    }
  }
  return result.join(' ').trim()
}

export default function VideoPage() {
  const router = useRouter()
  const [mode, setMode] = useState(null)
  const [step, setStep] = useState(1)
  const [files, setFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [videoFile, setVideoFile] = useState(null)
  const [videoPreview, setVideoPreview] = useState(null)

  const [captionMode, setCaptionMode] = useState(null)
  const [customPrompt, setCustomPrompt] = useState('')
  const [manualKo, setManualKo] = useState('')
  const [manualSub, setManualSub] = useState('')
  const [caption, setCaption] = useState('')
  const [manualMode, setManualMode] = useState(false)
  const [captionLoading, setCaptionLoading] = useState(false)

  const [subLang, setSubLang] = useState('en')
  const [selectedBGM, setSelectedBGM] = useState('auto')
  const [titleText, setTitleText] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState(['youtube_shorts'])
  const [generating, setGenerating] = useState(false)
  const [genProgress, setGenProgress] = useState(0)
  const [genMsg, setGenMsg] = useState('')
  const [genError, setGenError] = useState('')
  const [videos, setVideos] = useState({ portrait: null, landscape: null })
  const [uploading, setUploading] = useState(false)
  const [uploadResults, setUploadResults] = useState([])
  const [savedCaptionIds, setSavedCaptionIds] = useState({})  // { platform: captionId }
  const [starredMap, setStarredMap] = useState({})            // { platform: true/false }
  const [editingCaption, setEditingCaption] = useState(false)
  const [editCaptionDraft, setEditCaptionDraft] = useState('')

  // 플랫폼별 캡션 state
  const [platformCaptions, setPlatformCaptions] = useState({})
  const [captionGenerating, setCaptionGenerating] = useState({})
  const [streakInfo, setStreakInfo] = useState(null)
  useEffect(() => {
  fetch('/api/streak')
    .then(r => r.json())
    .then(d => { if (d.ok) setStreakInfo(d) })
    .catch(() => {})
}, [])
  const photoRef = useRef()
  const videoRef = useRef()
useEffect(() => {
  fetch('/api/streak')
    .then(r => r.json())
    .then(d => { if (d.ok) setStreakInfo(d) })
    .catch(() => {})
}, [])
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

  const runAICaption = async (prompt) => {
    setManualMode(false)
    setCaptionLoading(true); setStep(2)
    try {
      const s = await (await fetch('/api/shop')).json()
      const body = { shopName: s.shop_name, shopLocation: s.shop_location, shopType: s.shop_type, subLang }
      if (prompt) body.customPrompt = prompt

      // 사진이 있으면 최대 3장 → 작게 리사이즈 후 base64 전송 (Claude Vision이 실제 사진 보고 캡션 생성)
      if (files.length > 0) {
        // canvas로 긴 변 768px, JPEG 품질 0.7로 압축 → body 크기 초과(413) 방지
        const resizeToBase64 = (file) => new Promise((resolve, reject) => {
          const img = new Image()
          const url = URL.createObjectURL(file)
          img.onload = () => {
            URL.revokeObjectURL(url)
            const MAX = 768
            let { width, height } = img
            if (width > height && width > MAX) { height = Math.round(height * MAX / width); width = MAX }
            else if (height >= width && height > MAX) { width = Math.round(width * MAX / height); height = MAX }
            const canvas = document.createElement('canvas')
            canvas.width = width; canvas.height = height
            const ctx = canvas.getContext('2d')
            ctx.drawImage(img, 0, 0, width, height)
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
            resolve(dataUrl.split(',')[1])
          }
          img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('이미지 로드 실패')) }
          img.src = url
        })
        try {
          const imgList = await Promise.all(files.slice(0, 3).map(resizeToBase64))
          body.imageBase64List = imgList
        } catch (e) {
          console.error('이미지 압축 실패, 텍스트만으로 생성:', e)
        }
      }

      const res = await fetch('/api/caption', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (!res.ok) {
        console.error('캡션 API 응답 오류:', res.status)
        alert('캡션 생성에 실패했어요. 사진 장수를 줄이거나 다시 시도해주세요.')
        setCaption(''); setCaptionLoading(false); return
      }
      const d = await res.json()
      if (!d.result) {
        console.error('캡션 결과 비어있음:', d)
        alert('캡션 생성 결과가 비어있어요. 다시 시도해주세요.')
        setCaption(''); setCaptionLoading(false); return
      }
      setCaption(d.result)
    } catch (e) {
      console.error('캡션 생성 오류:', e)
      alert('캡션 생성 중 오류가 발생했어요. 다시 시도해주세요.')
      setCaption('')
    }
    setCaptionLoading(false)
  }

  const goManual = () => {
    setManualMode(true)
    setCaption('')
    setStep(2)
  }

  // 플랫폼별 AI 캡션 자동생성
  const generatePlatformCaption = async (platformId) => {
    setCaptionGenerating(prev => ({ ...prev, [platformId]: true }))
    const baseKo = extractSection(caption, 'ko') || manualKo || ''
    const title = extractSection(caption, 'titleLine1') || titleText?.split('\n')[0] || ''

    const prompts = {
      youtube_shorts: `제주도 소상공인 유튜브 쇼츠용 캡션을 만들어줘. JSON으로만 응답. 다른 텍스트 없이 JSON만.
제목힌트: ${title}
내용힌트: ${baseKo}
{"title":"제목(100자이내)","description":"설명(이모지+해시태그포함,500자이내)","tags":["태그1","태그2"]}`,
      youtube: `제주도 소상공인 유튜브 일반영상용 캡션을 만들어줘. SEO최적화. JSON으로만 응답. 다른 텍스트 없이 JSON만.
제목힌트: ${title}
내용힌트: ${baseKo}
{"title":"제목(100자이내)","description":"설명(SEO키워드포함,줄바꿈활용,1000자이내)","tags":["태그1","태그2"]}`,
      instagram: `제주도 소상공인 인스타그램 릴스용 캡션을 만들어줘. JSON으로만 응답. 다른 텍스트 없이 JSON만.
제목힌트: ${title}
내용힌트: ${baseKo}
{"caption":"캡션(이모지+줄바꿈포함,150자이내)","hashtags":["해시태그1","해시태그2"]}`,
      tiktok: `제주도 소상공인 틱톡용 캡션을 만들어줘. 짧고 트렌디하게. JSON으로만 응답. 다른 텍스트 없이 JSON만.
제목힌트: ${title}
내용힌트: ${baseKo}
{"caption":"한줄캡션(50자이내)","hashtags":["해시태그1","해시태그2","해시태그3"]}`,
    }

    try {
      const res = await fetch('/api/caption/platform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platformId, prompt: prompts[platformId] }),
      })
      const data = await res.json()
      if (data.result) {
        setPlatformCaptions(prev => ({ ...prev, [platformId]: data.result }))
      }
    } catch(e) {
      console.error('플랫폼 캡션 생성 오류:', e)
    } finally {
      setCaptionGenerating(prev => ({ ...prev, [platformId]: false }))
    }
  }

  const handleGenerate = async () => {
    if (!files.length) return
    setGenerating(true); setGenProgress(0); setGenError('')
    try {
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

      setGenMsg('🖼️ 이미지 업로드 중...')
      setGenProgress(5)
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
      const imageDataUrls = await Promise.all(
        files.map(async (file, i) => {
          const ts = Date.now()
          const filePath = `tmp/${ts}_${i}.jpg`
          const { error } = await sb.storage.from('videos').upload(filePath, file, {
            contentType: 'image/jpeg', upsert: true
          })
          if (error) throw new Error('이미지 업로드 실패: ' + error.message)
          const { data } = sb.storage.from('videos').getPublicUrl(filePath)
          return data.publicUrl
        })
      )
      setGenProgress(15)

      const ratios = selectedPlatforms.map(pid => PLATFORMS.find(p => p.id === pid)?.ratio)
      const needPortrait  = ratios.includes('portrait')
      const needLandscape = ratios.includes('landscape')
      const result = {}

      if (needPortrait) {
        setGenMsg('📱 세로 영상 제작 중... (10~30초 소요)')
        setGenProgress(20)
        const res = await fetch('/api/video/generate', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageDataUrls, koText, subText, titleLine1, titleLine2,
            bgmUrl, isPortrait: true, subLang,
          })
        })
        const data = await res.json()
        if (!data.ok) throw new Error(data.error || '세로 영상 생성 실패')
        result.portrait = { url: data.videoUrl, blob: null }
        setGenProgress(needLandscape ? 55 : 90)
      }

      if (needLandscape) {
        setGenMsg('🖥️ 가로 영상 제작 중...')
        setGenProgress(needPortrait ? 60 : 20)
        const res = await fetch('/api/video/generate', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageDataUrls, koText, subText, titleLine1, titleLine2,
            bgmUrl, isPortrait: false, subLang,
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
      const pc = platformCaptions[pid] || {}

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

      // 플랫폼별 캡션 우선 사용, 없으면 기본 캡션 사용
      let uploadTitle = pc.title || `고랑AI - ${platform.ratio === 'portrait' ? '세로' : '가로'} - ${new Date().toLocaleDateString('ko')}`
      let uploadCaption = ''
      if (pid === 'tiktok') {
        uploadCaption = [pc.caption, ...(pc.hashtags || [])].filter(Boolean).join(' ')
      } else if (pid === 'instagram') {
        uploadCaption = [pc.caption, (pc.hashtags || []).join(' ')].filter(Boolean).join('\n\n')
      } else {
        const tags = (pc.tags || []).map(t => `#${t}`).join(' ')
        uploadCaption = [pc.description, tags].filter(Boolean).join('\n\n') || (manualMode ? `${manualKo}\n${manualSub}` : caption)
      }

      form.append('video', blob, `gorang-${platform.ratio}.mp4`)
      form.append('caption', uploadCaption)
      form.append('title', uploadTitle)
      form.append('isShorts', isShorts ? 'true' : 'false')
      if (pc.tags) form.append('tags', JSON.stringify(pc.tags))

      try {
        const endpoint = pid === 'tiktok' ? '/api/upload/tiktok' : '/api/upload/youtube'

        // 모바일은 업로드가 느려 타임아웃이 잘 남 → 5분까지 기다림
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000)

        let res
        try {
          res = await fetch(endpoint, { method: 'POST', body: form, signal: controller.signal })
        } finally {
          clearTimeout(timeoutId)
        }

        // 응답을 텍스트로 먼저 받아서 JSON 파싱 시도 (JSON 아닐 때 대비)
        const raw = await res.text()
        let data
        try {
          data = JSON.parse(raw)
        } catch {
          // JSON이 아니면 서버 에러 (502, 504 등). 영상은 올라갔을 수 있음
          results.push({
            platform: pid,
            status: res.ok ? '✅ 업로드 완료 (확인 필요)' : `⚠️ 서버 응답 지연 — 실제로는 올라갔을 수 있어요 (${res.status})`,
          })
          continue
        }

        const url = pid === 'tiktok'
          ? (data.ok ? '틱톡 앱에서 비공개로 확인' : undefined)
          : data.youtubeUrl
        results.push({
          platform: pid,
          status: data.ok ? '✅ 업로드 완료' : `❌ 실패 (${data.detail || data.error || ''})`,
          url,
        })
      } catch (e) {
        // AbortError = 타임아웃. 이 경우 실제로는 업로드 완료됐을 가능성 높음
        if (e.name === 'AbortError') {
          results.push({
            platform: pid,
            status: '⚠️ 응답이 늦어요 — 영상은 올라갔을 수 있으니 채널에서 확인해주세요',
          })
        } else {
          results.push({ platform: pid, status: `❌ 네트워크 오류 (${e.message || e.name || '알 수 없음'})` })
        }
      }
    }
    setUploadResults(results)

    // ── 캡션 자동 저장 ──────────────────────────────────────
    // 업로드 완료된 플랫폼에 대해서만 저장
    const successPlatforms = results.filter(r => r.status.includes('✅')).map(r => r.platform)
    if (successPlatforms.length > 0) {
      // source 판별
      let source = 'ai_auto'
      if (manualMode) source = 'user_written'
      else if (captionMode === 'prompt') source = 'prompt'
      else if (captionMode === 'auto') source = 'ai_auto'

      // 캡션이 AI꺼에서 수정됐는지 — manualMode가 아닌데 caption이 있고 platformCaptions도 있으면 사용자가 수정했을 수 있음
      // 단순하게: manualMode가 아닌데 platformCaptions에 직접 입력한 흔적이 있으면 was_modified=true
      const was_modified = !manualMode && captionMode !== null && caption !== ''
        ? false  // 일단 AI 그대로로 처리, 추후 onChange 감지로 개선
        : false

      const captionText = manualMode
        ? `${manualKo}
${manualSub}`.trim()
        : caption

      const newIds = {}
      for (const pid of successPlatforms) {
        const pc = platformCaptions[pid] || {}
        const finalCaption = pc.caption || captionText || ''
        if (!finalCaption) continue
        try {
          const res = await fetch('/api/caption/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              caption: finalCaption,
              source,
              platform: pid,
              photo_tags: [],   // 추후 Claude Vision 태그 연결
              was_modified,
            }),
          })
          const d = await res.json()
          if (d.captionId) newIds[pid] = d.captionId
        } catch (e) {
          console.error('캡션 저장 실패:', e)
        }
      }
      setSavedCaptionIds(newIds)
    }
    // ─────────────────────────────────────────────────────────

    setUploading(false)
    setStep(4)
  }

  const reset = () => {
    setStep(1); setMode(null); setFiles([]); setPreviews([])
    setCaption(''); setVideos({ portrait: null, landscape: null })
    setVideoFile(null); setVideoPreview(null); setUploadResults([])
    setGenError(''); setGenProgress(0); setCaptionMode(null)
    setCustomPrompt(''); setManualKo(''); setManualSub(''); setManualMode(false)
    setPlatformCaptions({}); setCaptionGenerating({})
    setSavedCaptionIds({}); setStarredMap({})
  }

  // 별표 토글
  const handleStar = async (platform) => {
    const captionId = savedCaptionIds[platform]
    if (!captionId) return
    const newStarred = !starredMap[platform]
    setStarredMap(prev => ({ ...prev, [platform]: newStarred }))
    try {
      await fetch('/api/caption/save', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ captionId, starred: newStarred }),
      })
    } catch (e) {
      console.error('별표 저장 실패:', e)
      // 실패 시 롤백
      setStarredMap(prev => ({ ...prev, [platform]: !newStarred }))
    }
  }

  const goBackToCaptionSelect = () => {
    setCaptionMode(null); setCustomPrompt('')
  }

  if (step === 4) return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', padding:'32px 24px', alignItems:'center' }}>
<div style={{ fontSize:40, marginBottom:12 }}>🎉</div>
<div style={{ fontSize:20, fontWeight:700, color:'#1A2421', marginBottom:8 }}>완료!</div>
{streakInfo && streakInfo.currentStreak > 0 && (
  <div style={{
    background: 'linear-gradient(135deg, #FF6B35, #FF8C42)',
    borderRadius: 12,
    padding: '10px 18px',
    marginBottom: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  }}>
    <span style={{ fontSize: 22 }}>🔥</span>
    <div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
        {streakInfo.currentStreak}주 연속 업로드 중!
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>
        역대 최장 {streakInfo.longestStreak}주 · 이번 주 {streakInfo.thisWeekCount}회 업로드
      </div>
    </div>
  </div>
)}
      {uploadResults.map((r, i) => {
        const p = PLATFORMS.find(x => x.id === r.platform)
        const isSuccess = r.status.includes('✅')
        const hasCaptionId = !!savedCaptionIds[r.platform]
        const isStarred = !!starredMap[r.platform]
        return (
          <div key={i} style={{ width:'100%', background:'#F4F6F5', borderRadius:12, padding:'12px 14px', marginBottom:8 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ fontSize:13, fontWeight:600 }}>{p?.icon} {p?.name}</div>
              {/* 별표 버튼 — 업로드 성공 + 캡션 저장된 경우만 노출 */}
              {isSuccess && hasCaptionId && (
                <button
                  onClick={() => handleStar(r.platform)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 20,
                    lineHeight: 1,
                    padding: '2px 4px',
                    color: isStarred ? '#F5A623' : '#D0D5D2',
                    transition: 'color 0.15s',
                  }}
                  title={isStarred ? '별표 취소' : '이 캡션 마음에 들었어요'}
                >
                  {isStarred ? '⭐' : '☆'}
                </button>
              )}
            </div>
            <div style={{ fontSize:12, color: isSuccess ? '#1D9E75' : '#EF9F27', marginTop:3 }}>{r.status}</div>
            {/* 별표 안내 문구 */}
            {isSuccess && hasCaptionId && !isStarred && (
              <div style={{ fontSize:10, color:'#B0BAB6', marginTop:4 }}>
                ☆ 이 캡션이 마음에 들면 별표를 눌러주세요
              </div>
            )}
            {isSuccess && hasCaptionId && isStarred && (
              <div style={{ fontSize:10, color:'#1D9E75', marginTop:4 }}>
                ⭐ 별표 캡션으로 저장됐어요
              </div>
            )}
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
      <TopBar title="영상 만들기" sub={!mode ? '제작 방식 선택' : step===1 ? '설정' : step===2 ? (manualMode ? '캡션 작성' : '캡션 확인') : step===3 ? '캡션 & 업로드' : '완료'} />
      <div style={{ flex:1, padding:'0 18px 24px', overflowY:'auto' }}>

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
                    ? <video src={`${videoPreview}#t=0.1`} preload="metadata" playsInline style={{ width:'100%', borderRadius:8, maxHeight:160, objectFit:'cover' }} controls />
                    : <><div style={{ fontSize:26, marginBottom:4 }}>🎬</div><div style={{ fontSize:13, color:'#6B7875', fontWeight:600 }}>영상 파일 선택</div><div style={{ fontSize:11, color:'#B0BAB6', marginTop:2 }}>MP4, MOV</div></>}
                </div>
              </>
            )}

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

        {mode && step === 1 && captionMode === 'manual' && (
          <>
            <div style={{ background:'#F4F6F5', borderRadius:12, padding:'12px 14px', marginBottom:14, fontSize:11.5, color:'#3A4744', lineHeight:1.6 }}>
              ✏️ 주제목은 화면 중앙 큰 글씨, 설명글은 하단 자막으로 들어가요.
            </div>
            <div style={{ fontSize:12, fontWeight:600, color:'#1A2421', marginBottom:6 }}>🎬 주제목 (화면 중앙)</div>
            <textarea
              value={titleText}
              onChange={e => setTitleText(e.target.value)}
              placeholder={"1줄: JEJU CAFE\n2줄: 천국같은 에메랄드빛 오션뷰 카페"}
              style={{ width:'100%', minHeight:70, padding:'10px 12px', borderRadius:10, border:'1.5px solid #5DCAA5', fontSize:13, color:'#1A2421', fontFamily:'Noto Sans KR, sans-serif', boxSizing:'border-box', outline:'none', marginBottom:4, resize:'none', lineHeight:1.6 }}
            />
            <div style={{ fontSize:11, color:'#B0BAB6', marginBottom:10 }}>↵ 엔터로 줄 구분 — 1줄: 영문 제목 / 2줄: 한국어 설명</div>
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
                    <div style={{ marginBottom:12 }}>
                      <div style={{ fontSize:11, color:'#6B7875', fontWeight:600, marginBottom:4 }}>🎬 주제목 (화면 중앙)</div>
                      <div style={{ fontSize:13, color:'#1A2421', lineHeight:1.7 }}>
                        <span style={{ fontWeight:700 }}>{extractSection(caption, 'titleLine1') || '—'}</span>
                        <br/>
                        <span style={{ color:'#3A4744' }}>{extractSection(caption, 'titleLine2') || '—'}</span>
                      </div>
                      <textarea
                        value={titleText}
                        onChange={e => setTitleText(e.target.value)}
                        placeholder={"1줄: MANGO CAFE\n2줄: 망고가 가득한 감성 카페\n(비우면 AI 생성 그대로 사용)"}
                        rows={2}
                        style={{ width:'100%', marginTop:8, padding:'8px 10px', borderRadius:8, border:'1.5px solid #C8EFE0', fontSize:12, color:'#1A2421', fontFamily:'Noto Sans KR, sans-serif', boxSizing:'border-box', outline:'none', resize:'none', lineHeight:1.6 }}
                      />
                      <div style={{ fontSize:11, color:'#B0BAB6', marginTop:4 }}>✏️ 1줄: 영문 제목 / 2줄: 한국어 훅 (엔터로 구분)</div>
                    </div>
                    <div style={{ borderTop:'1px solid rgba(0,0,0,0.06)', paddingTop:10, marginBottom:8 }}>
                      <div style={{ fontSize:11, color:'#6B7875', fontWeight:600, marginBottom:4 }}>🇰🇷 설명글 (하단 자막)</div>
                      <div style={{ fontSize:13, color:'#1A2421', lineHeight:1.6 }}>
                        {extractSection(caption, 'ko') || '한국어 설명글 생성 중...'}
                      </div>
                    </div>
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
                    <button onClick={() => { setEditCaptionDraft(caption); setEditingCaption(true) }}
                      style={{ flex:1, padding:10, borderRadius:14, border:'1.5px solid #1D9E75', background:'transparent', color:'#1D9E75', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'Noto Sans KR, sans-serif' }}>
                      ✎ 직접 수정
                    </button>
                  </div>

                  {/* 캡션 전체 수정 인라인 UI */}
                  {editingCaption && (
                    <div style={{ background:'#fff', border:'1.5px solid #1D9E75', borderRadius:14, padding:14, marginBottom:14 }}>
                      <div style={{ fontSize:11, color:'#0F6E56', fontWeight:700, marginBottom:8 }}>✎ 캡션 직접 수정</div>
                      <textarea
                        value={editCaptionDraft}
                        onChange={e => setEditCaptionDraft(e.target.value)}
                        style={{
                          width:'100%', minHeight:180, padding:'10px 12px',
                          borderRadius:10, border:'1.5px solid #C8EFE0',
                          fontSize:12, color:'#1A2421',
                          fontFamily:'Noto Sans KR, sans-serif',
                          boxSizing:'border-box', outline:'none',
                          lineHeight:1.7, resize:'vertical',
                        }}
                      />
                      <div style={{ display:'flex', gap:8, marginTop:10 }}>
                        <button onClick={() => setEditingCaption(false)}
                          style={{ flex:1, padding:'9px', borderRadius:10, border:'1.5px solid #E6EAE8', background:'#fff', color:'#6B7875', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'Noto Sans KR, sans-serif' }}>
                          취소
                        </button>
                        <button onClick={() => { setCaption(editCaptionDraft); setEditingCaption(false) }}
                          style={{ flex:2, padding:'9px', borderRadius:10, border:'none', background:'#1D9E75', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'Noto Sans KR, sans-serif' }}>
                          ✓ 수정 완료
                        </button>
                      </div>
                    </div>
                  )}
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
                <div style={{ fontSize:11, color:'#085041', marginTop:6 }}>Railway 서버에서 영상을 만들고 있어요 🌿</div>
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
                : <PrimaryBtn onClick={() => setStep(3)}>다음 → 캡션 설정</PrimaryBtn>
            )}
            <GhostBtn onClick={() => { setStep(1); if(!manualMode) setCaptionMode(null) }} style={{ marginTop:8 }}>← 돌아가기</GhostBtn>
          </>
        )}

        {step === 3 && (
          <>
            {videos.portrait && (
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:11, color:'#6B7875', marginBottom:5, fontWeight:500 }}>📱 세로 영상 (9:16)</div>
                <video src={`${videos.portrait.url}#t=0.1`} controls playsInline preload="metadata"
                  style={{ width:'100%', borderRadius:12, maxHeight:220, objectFit:'contain', background:'#000' }} />
              </div>
            )}
            {videos.landscape && (
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:11, color:'#6B7875', marginBottom:5, fontWeight:500 }}>🖥️ 가로 영상 (16:9)</div>
                <video src={`${videos.landscape.url}#t=0.1`} controls playsInline preload="metadata"
                  style={{ width:'100%', borderRadius:12, maxHeight:160, objectFit:'contain', background:'#000' }} />
              </div>
            )}
            {videoPreview && !videos.portrait && !videos.landscape && (
              <video src={`${videoPreview}#t=0.1`} controls playsInline preload="metadata"
                style={{ width:'100%', borderRadius:12, maxHeight:200, objectFit:'cover', marginBottom:12 }} />
            )}

            {/* 플랫폼별 캡션 & 해시태그 */}
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#1A2421', marginBottom:10 }}>📝 플랫폼별 캡션 & 해시태그</div>
              {selectedPlatforms.map(pid => {
                const p = PLATFORMS.find(x => x.id === pid)
                const pc = platformCaptions[pid] || {}
                const isGenerating = captionGenerating[pid]
                return (
                  <div key={pid} style={{ background:'#fff', border:'1.5px solid #E6EAE8', borderRadius:14, padding:'14px', marginBottom:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:'#1A2421' }}>{p?.icon} {p?.name}</div>
                      <button
                        onClick={() => generatePlatformCaption(pid)}
                        disabled={isGenerating}
                        style={{ padding:'5px 10px', borderRadius:8, border:'1.5px solid #1D9E75', background: isGenerating ? '#E1F5EE' : '#fff', color:'#1D9E75', fontSize:11, fontWeight:700, cursor: isGenerating ? 'not-allowed' : 'pointer', fontFamily:'Noto Sans KR, sans-serif' }}>
                        {isGenerating ? '생성 중...' : '✨ AI 자동생성'}
                      </button>
                    </div>

                    {(pid === 'youtube_shorts' || pid === 'youtube') && (
                      <>
                        <div style={{ fontSize:11, color:'#6B7875', fontWeight:600, marginBottom:4 }}>제목</div>
                        <input
                          value={pc.title || ''}
                          onChange={e => setPlatformCaptions(prev => ({ ...prev, [pid]: { ...prev[pid], title: e.target.value } }))}
                          placeholder="영상 제목 입력"
                          style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1.5px solid #E6EAE8', fontSize:12, color:'#1A2421', fontFamily:'Noto Sans KR, sans-serif', boxSizing:'border-box', outline:'none', marginBottom:8 }}
                        />
                        <div style={{ fontSize:11, color:'#6B7875', fontWeight:600, marginBottom:4 }}>설명</div>
                        <textarea
                          value={pc.description || ''}
                          onChange={e => setPlatformCaptions(prev => ({ ...prev, [pid]: { ...prev[pid], description: e.target.value } }))}
                          placeholder="영상 설명 (SEO 키워드, 링크 포함)"
                          style={{ width:'100%', minHeight: pid === 'youtube' ? 100 : 70, padding:'8px 10px', borderRadius:8, border:'1.5px solid #E6EAE8', fontSize:12, color:'#1A2421', fontFamily:'Noto Sans KR, sans-serif', boxSizing:'border-box', outline:'none', resize:'vertical', lineHeight:1.5, marginBottom:8 }}
                        />
                        <div style={{ fontSize:11, color:'#6B7875', fontWeight:600, marginBottom:6 }}>태그</div>
                        {(pc.tags || []).length > 0 && (
                          <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:6 }}>
                            {(pc.tags || []).map((tag, i) => (
                              <span key={i} style={{ padding:'3px 8px', borderRadius:20, background:'#E1F5EE', color:'#0F6E56', fontSize:11 }}>#{tag}</span>
                            ))}
                          </div>
                        )}
                        <input
                          value={(pc.tags || []).join(', ')}
                          onChange={e => setPlatformCaptions(prev => ({ ...prev, [pid]: { ...prev[pid], tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) } }))}
                          placeholder="태그1, 태그2, 태그3 (쉼표 구분)"
                          style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1.5px solid #E6EAE8', fontSize:12, color:'#1A2421', fontFamily:'Noto Sans KR, sans-serif', boxSizing:'border-box', outline:'none' }}
                        />
                      </>
                    )}

                    {pid === 'instagram' && (
                      <>
                        <div style={{ fontSize:11, color:'#6B7875', fontWeight:600, marginBottom:4 }}>캡션</div>
                        <textarea
                          value={pc.caption || ''}
                          onChange={e => setPlatformCaptions(prev => ({ ...prev, [pid]: { ...prev[pid], caption: e.target.value } }))}
                          placeholder="이모지 + 감성 캡션 입력"
                          style={{ width:'100%', minHeight:80, padding:'8px 10px', borderRadius:8, border:'1.5px solid #E6EAE8', fontSize:12, color:'#1A2421', fontFamily:'Noto Sans KR, sans-serif', boxSizing:'border-box', outline:'none', resize:'vertical', lineHeight:1.5, marginBottom:8 }}
                        />
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                          <div style={{ fontSize:11, color:'#6B7875', fontWeight:600 }}>해시태그</div>
                          <div style={{ fontSize:10, color: (pc.hashtags?.length || 0) > 25 ? '#EF9F27' : '#B0BAB6' }}>
                            {pc.hashtags?.length || 0} / 30
                          </div>
                        </div>
                        {(pc.hashtags || []).length > 0 && (
                          <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:6 }}>
                            {(pc.hashtags || []).map((tag, i) => (
                              <span key={i} style={{ padding:'3px 8px', borderRadius:20, background:'#E1F5EE', color:'#0F6E56', fontSize:11 }}>{tag.startsWith('#') ? tag : '#'+tag}</span>
                            ))}
                          </div>
                        )}
                        <input
                          value={(pc.hashtags || []).join(' ')}
                          onChange={e => setPlatformCaptions(prev => ({ ...prev, [pid]: { ...prev[pid], hashtags: e.target.value.split(/\s+/).filter(Boolean) } }))}
                          placeholder="#제주카페 #오션뷰 #jeju (공백 구분)"
                          style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1.5px solid #E6EAE8', fontSize:12, color:'#1A2421', fontFamily:'Noto Sans KR, sans-serif', boxSizing:'border-box', outline:'none' }}
                        />
                      </>
                    )}

                    {pid === 'tiktok' && (
                      <>
                        <div style={{ fontSize:11, color:'#6B7875', fontWeight:600, marginBottom:4 }}>캡션 (한 줄)</div>
                        <input
                          value={pc.caption || ''}
                          onChange={e => setPlatformCaptions(prev => ({ ...prev, [pid]: { ...prev[pid], caption: e.target.value } }))}
                          placeholder="짧고 임팩트 있는 한 줄 캡션"
                          style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1.5px solid #E6EAE8', fontSize:12, color:'#1A2421', fontFamily:'Noto Sans KR, sans-serif', boxSizing:'border-box', outline:'none', marginBottom:8 }}
                        />
                        <div style={{ fontSize:11, color:'#6B7875', fontWeight:600, marginBottom:6 }}>트렌드 해시태그</div>
                        {(pc.hashtags || []).length > 0 && (
                          <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:6 }}>
                            {(pc.hashtags || []).map((tag, i) => (
                              <span key={i} style={{ padding:'3px 8px', borderRadius:20, background:'#E1F5EE', color:'#0F6E56', fontSize:11 }}>{tag.startsWith('#') ? tag : '#'+tag}</span>
                            ))}
                          </div>
                        )}
                        <input
                          value={(pc.hashtags || []).join(' ')}
                          onChange={e => setPlatformCaptions(prev => ({ ...prev, [pid]: { ...prev[pid], hashtags: e.target.value.split(/\s+/).filter(Boolean) } }))}
                          placeholder="#jeju #제주여행 #카페투어 (공백 구분)"
                          style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1.5px solid #E6EAE8', fontSize:12, color:'#1A2421', fontFamily:'Noto Sans KR, sans-serif', boxSizing:'border-box', outline:'none' }}
                        />
                      </>
                    )}
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
