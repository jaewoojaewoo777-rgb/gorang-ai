'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { BottomNav, TopBar, PrimaryBtn, GhostBtn, AiBox, LoadingDots } from '../../components/ui'

function createBGM(ctx, type) {
  const master = ctx.createGain()
  master.gain.value = 0.18
  master.connect(ctx.destination)
  const presets = {
    calm:    [{ freq: 220, amp: 0.5 }, { freq: 330, amp: 0.3 }, { freq: 440, amp: 0.2 }],
    bright:  [{ freq: 261, amp: 0.4 }, { freq: 392, amp: 0.4 }, { freq: 523, amp: 0.3 }],
    jeju:    [{ freq: 196, amp: 0.5 }, { freq: 294, amp: 0.3 }, { freq: 370, amp: 0.2 }],
    luxury:  [{ freq: 174, amp: 0.4 }, { freq: 261, amp: 0.3 }, { freq: 349, amp: 0.2 }],
  }
  const nodes = (presets[type] || presets.calm).map(({ freq, amp }) => {
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    const filter = ctx.createBiquadFilter()
    osc.type = 'sine'; osc.frequency.value = freq; g.gain.value = amp
    filter.type = 'lowpass'; filter.frequency.value = 800
    osc.connect(filter); filter.connect(g); g.connect(master); osc.start()
    return osc
  })
  return () => nodes.forEach(o => { try { o.stop() } catch {} })
}

const BGM_LIST = [
  { id: 'none',   name: '🔇 없음' },
  { id: 'calm',   name: '🌊 잔잔한 감성' },
  { id: 'bright', name: '☀️ 밝고 경쾌한' },
  { id: 'jeju',   name: '🌿 제주 자연' },
  { id: 'luxury', name: '✨ 럭셔리' },
]

const LANG_LIST = [
  { code: 'en', flag: '🇺🇸', name: '영어' },
  { code: 'zh', flag: '🇨🇳', name: '중국어' },
  { code: 'ja', flag: '🇯🇵', name: '일본어' },
  { code: 'ko', flag: '🇰🇷', name: '한국어' },
]

const PLATFORMS = [
  { id: 'youtube_shorts', icon: '▶️', name: 'YouTube Shorts', defaultRatio: 'portrait' },
  { id: 'instagram',      icon: '📸', name: 'Instagram 릴스',  defaultRatio: 'portrait' },
  { id: 'tiktok',         icon: '🎵', name: 'TikTok',          defaultRatio: 'portrait' },
  { id: 'youtube',        icon: '📺', name: 'YouTube 일반',     defaultRatio: 'landscape' },
]

// ratio: 'portrait' | 'landscape' | 'both'
const RATIO_OPTIONS = [
  { value: 'portrait',  label: '세로' },
  { value: 'landscape', label: '가로' },
  { value: 'both',      label: '둘 다' },
]

async function buildVideo({ imgs, captionText, bgmType, isPortrait, onProgress }) {
  const W = isPortrait ? 1080 : 1920
  const H = isPortrait ? 1920 : 1080
  const PER_IMG = 3000
  const FPS = 24

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

  const firstLine = captionText
    .split('\n').find(l => l.trim())
    ?.replace(/[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/g, '').trim() || ''

  const TOTAL_MS = imgs.length * PER_IMG

  for (let i = 0; i < imgs.length; i++) {
    const img = imgs[i]
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
        const grad = ctx.createLinearGradient(0, H * 0.5, 0, H)
        grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(0,0,0,0.72)')
        ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H)
        if (firstLine) {
          const fadeIn  = Math.min(1, elapsed / 600)
          const fadeOut = elapsed > PER_IMG - 600 ? Math.max(0, (PER_IMG - elapsed) / 600) : 1
          const alpha   = fadeIn * fadeOut
          const fontSize = isPortrait ? 54 : 40
          ctx.save(); ctx.globalAlpha = alpha
          ctx.font = `bold ${fontSize}px "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`
          ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
          ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 14
          const maxW = W - 100
          const words = firstLine.split('')
          let line = '', lines = []
          for (const ch of words) {
            const test = line + ch
            if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = ch }
            else line = test
          }
          if (line) lines.push(line)
          const lh = fontSize + 10
          const baseY = H - (isPortrait ? 180 : 100)
          ctx.fillStyle = '#fff'
          lines.slice(0, 3).forEach((l, li) => {
            ctx.fillText(l, W / 2, baseY - (lines.length - 1 - li) * lh)
          })
          ctx.restore()
        }
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
  const [caption, setCaption] = useState('')
  const [captionLoading, setCaptionLoading] = useState(false)
  const [selectedLangs, setSelectedLangs] = useState(['en', 'zh'])
  const [selectedBGM, setSelectedBGM] = useState('calm')
  const [selectedPlatforms, setSelectedPlatforms] = useState(['youtube_shorts'])
  // ratio: 'portrait' | 'landscape' | 'both'
  const [platformRatio, setPlatformRatio] = useState({
    youtube_shorts: 'portrait', instagram: 'portrait',
    tiktok: 'portrait', youtube: 'landscape',
  })
  const [generating, setGenerating] = useState(false)
  const [genProgress, setGenProgress] = useState(0)
  const [genMsg, setGenMsg] = useState('')
  const [genError, setGenError] = useState('')
  const [videos, setVideos] = useState({ portrait: null, landscape: null })
  const [uploading, setUploading] = useState(false)
  const [uploadResults, setUploadResults] = useState([])
  const photoRef = useRef()
  const videoRef = useRef()

  const handlePhotos = e => {
    const sel = Array.from(e.target.files)
    setFiles(p => [...p, ...sel])
    setPreviews(p => [...p, ...sel.map(f => URL.createObjectURL(f))])
  }
  const handleVideo = e => {
    const f = e.target.files[0]; if (!f) return
    setVideoFile(f); setVideoPreview(URL.createObjectURL(f))
  }
  const toggleLang = code => setSelectedLangs(p => p.includes(code) ? p.filter(x => x !== code) : [...p, code])
  const togglePlatform = id => setSelectedPlatforms(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])

  const handleCaption = async () => {
    setCaptionLoading(true)
    try {
      const s = await (await fetch('/api/shop')).json()
      const d = await (await fetch('/api/caption', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopName: s.shop_name, shopLocation: s.shop_location, shopType: s.shop_type })
      })).json()
      setCaption(d.result || '')
    } catch { setCaption('') }
    setCaptionLoading(false)
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

      // 선택된 플랫폼들의 ratio 합산해서 필요한 영상 종류 결정
      const ratios = selectedPlatforms.map(p => platformRatio[p])
      const needPortrait  = ratios.some(r => r === 'portrait' || r === 'both')
      const needLandscape = ratios.some(r => r === 'landscape' || r === 'both')
      const result = {}

      if (needPortrait) {
        setGenMsg('📱 세로 영상 제작 중...')
        const blob = await buildVideo({
          imgs, captionText: caption, bgmType: selectedBGM, isPortrait: true,
          onProgress: p => setGenProgress(needLandscape ? p * 0.5 : p)
        })
        result.portrait = { blob, url: URL.createObjectURL(blob) }
      }

      if (needLandscape) {
        setGenMsg('🖥️ 가로 영상 제작 중...')
        const blob = await buildVideo({
          imgs, captionText: caption, bgmType: selectedBGM, isPortrait: false,
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
      const ratio = platformRatio[pid]

      if (pid === 'instagram') {
        results.push({ platform: pid, status: '⏳ 심사 후 업로드 예정' }); continue
      }

      // ratio가 'both'면 세로/가로 둘 다 업로드
      const uploadRatios = ratio === 'both' ? ['portrait', 'landscape'] : [ratio]

      for (const r of uploadRatios) {
        const blob = videos[r]?.blob || videoFile
        if (!blob) { results.push({ platform: pid, status: `파일 없음 (${r})` }); continue }

        const form = new FormData()
        const isShorts = pid === 'youtube_shorts' || r === 'portrait'
        form.append('video', blob, `gorang-${r}.mp4`)
        form.append('caption', caption)
        form.append('title', `고랑AI - ${r === 'portrait' ? '세로' : '가로'} - ${new Date().toLocaleDateString('ko')}`)
        form.append('isShorts', isShorts ? 'true' : 'false')

        try {
          const endpoint = pid === 'tiktok' ? '/api/upload/tiktok' : '/api/upload/youtube'
          const data = await (await fetch(endpoint, { method: 'POST', body: form })).json()
          const url = pid === 'tiktok'
            ? (data.ok ? '틱톡 앱에서 비공개로 확인' : undefined)
            : data.youtubeUrl
          results.push({
            platform: pid,
            ratioLabel: ratio === 'both' ? (r === 'portrait' ? ' (세로)' : ' (가로)') : '',
            status: data.ok ? '✅ 업로드 완료' : `❌ 실패 (${data.detail || data.error || ''})`,
            url,
          })
        } catch { results.push({ platform: pid, ratioLabel: '', status: '❌ 네트워크 오류' }) }
      }
    }
    setUploadResults(results)
    setUploading(false)
    setStep(4)
  }

  const reset = () => {
    setStep(1); setMode(null); setFiles([]); setPreviews([])
    setCaption(''); setVideos({ portrait: null, landscape: null })
    setVideoFile(null); setVideoPreview(null); setUploadResults([])
    setGenError(''); setGenProgress(0)
  }

  if (step === 4) return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', padding:'32px 24px', alignItems:'center' }}>
      <div style={{ fontSize:40, marginBottom:12 }}>🎉</div>
      <div style={{ fontSize:20, fontWeight:700, color:'#1A2421', marginBottom:16 }}>완료!</div>
      {uploadResults.map((r, i) => {
        const p = PLATFORMS.find(x => x.id === r.platform)
        return (
          <div key={i} style={{ width:'100%', background:'#F4F6F5', borderRadius:12, padding:'12px 14px', marginBottom:8 }}>
            <div style={{ fontSize:13, fontWeight:600 }}>{p?.icon} {p?.name}{r.ratioLabel}</div>
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
      <TopBar title="영상 만들기" sub={!mode ? '제작 방식 선택' : step===1 ? '설정' : step===2 ? '캡션 확인' : '미리보기'} />
      <div style={{ flex:1, padding:'0 18px 24px', overflowY:'auto' }}>

        {!mode && (
          <>
            {[
              { id:'photos', emoji:'📸', title:'사진으로 영상 만들기', sub:'사진 여러 장 → BGM + 자막 + 영상 자동 제작' },
              { id:'existing', emoji:'🎬', title:'내 영상 올리기', sub:'직접 만든 영상을 업로드' },
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

        {mode && step === 1 && (
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

            {/* 플랫폼 선택 - 세로/가로/둘다 */}
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, color:'#6B7875', fontWeight:500, marginBottom:8 }}>📤 업로드 플랫폼</div>
              {PLATFORMS.map(p => (
                <div key={p.id} onClick={() => togglePlatform(p.id)}
                  style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', marginBottom:6, borderRadius:10, border:`1.5px solid ${selectedPlatforms.includes(p.id)?'#1D9E75':'#E6EAE8'}`, background: selectedPlatforms.includes(p.id)?'#E1F5EE':'#fff', cursor:'pointer' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <input type="checkbox" checked={selectedPlatforms.includes(p.id)} readOnly style={{ width:15, height:15, accentColor:'#1D9E75' }} />
                    <span style={{ fontSize:13, color:'#1A2421' }}>{p.icon} {p.name}</span>
                  </div>
                  <div style={{ display:'flex', gap:4 }}>
                    {RATIO_OPTIONS.map(r => (
                      <button key={r.value} onClick={e => { e.stopPropagation(); setPlatformRatio(prev => ({...prev, [p.id]: r.value})) }}
                        style={{ padding:'3px 7px', borderRadius:10, border:`1px solid ${platformRatio[p.id]===r.value?'#1D9E75':'#E6EAE8'}`, background: platformRatio[p.id]===r.value?'#1D9E75':'#fff', color: platformRatio[p.id]===r.value?'#fff':'#6B7875', fontSize:10, cursor:'pointer', fontFamily:'Noto Sans KR, sans-serif', fontWeight: platformRatio[p.id]===r.value?700:400 }}>
                        {r.label}
                      </button>
                    ))}
                  </div>
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

            {/* 자막 */}
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:11, color:'#6B7875', fontWeight:500, marginBottom:8 }}>💬 자막 언어</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                <button onClick={() => setSelectedLangs([])}
                  style={{ padding:'6px 12px', borderRadius:20, border:`1.5px solid ${!selectedLangs.length?'#5DCAA5':'#E6EAE8'}`, background: !selectedLangs.length?'#E1F5EE':'#fff', color: !selectedLangs.length?'#0F6E56':'#6B7875', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'Noto Sans KR, sans-serif' }}>
                  없음
                </button>
                {LANG_LIST.map(l => (
                  <button key={l.code} onClick={() => toggleLang(l.code)}
                    style={{ padding:'6px 12px', borderRadius:20, border:`1.5px solid ${selectedLangs.includes(l.code)?'#5DCAA5':'#E6EAE8'}`, background: selectedLangs.includes(l.code)?'#E1F5EE':'#fff', color: selectedLangs.includes(l.code)?'#0F6E56':'#6B7875', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'Noto Sans KR, sans-serif' }}>
                    {l.flag} {l.name}
                  </button>
                ))}
              </div>
            </div>

            <PrimaryBtn onClick={handleCaption} disabled={mode==='photos'?!files.length:!videoFile}>
              ✦ AI 캡션 생성하기
            </PrimaryBtn>
            <GhostBtn onClick={() => setMode(null)} style={{ marginTop:8 }}>← 돌아가기</GhostBtn>
          </>
        )}

        {step === 2 && (
          <>
            {captionLoading
              ? <div style={{ background:'#E1F5EE', borderRadius:14, padding:16, border:'1.5px solid #5DCAA5', marginBottom:12 }}>
                  <div style={{ fontSize:10, color:'#0F6E56', fontWeight:700, marginBottom:8 }}>✦ AI 캡션 생성 중...</div>
                  <LoadingDots />
                </div>
              : <>
                  <AiBox label="✦ AI 생성 캡션 (자막으로 사용)">{caption || '캡션이 없어요. 직접 입력해 주세요.'}</AiBox>
                  <div style={{ display:'flex', gap:8, marginBottom:14 }}>
                    <GhostBtn onClick={handleCaption} style={{ flex:1, padding:'10px', fontSize:12 }}>↻ 다시 생성</GhostBtn>
                    <button onClick={() => { const t = prompt('자막 수정:', caption); if(t!==null) setCaption(t) }}
                      style={{ flex:1, padding:10, borderRadius:14, border:'1.5px solid #1D9E75', background:'transparent', color:'#1D9E75', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'Noto Sans KR, sans-serif' }}>
                      ✎ 직접 수정
                    </button>
                  </div>
                </>
            }

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
            <GhostBtn onClick={() => setStep(1)} style={{ marginTop:8 }}>← 돌아가기</GhostBtn>
          </>
        )}

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
                const r = platformRatio[pid]
                return (
                  <div key={pid} style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'5px 0', borderBottom:'1px solid #E6EAE8' }}>
                    <span>{p?.icon} {p?.name}</span>
                    <span style={{ color:'#6B7875', fontSize:11 }}>
                      {r === 'both' ? '세로 + 가로 둘 다' : r === 'portrait' ? '세로 9:16' : '가로 16:9'}
                    </span>
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
