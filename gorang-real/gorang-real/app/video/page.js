'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { BottomNav, TopBar, PrimaryBtn, GhostBtn, AiBox, LoadingDots } from '../../components/ui'

export default function VideoPage() {
  const router = useRouter()
  const [step, setStep] = useState(1) // 1:설정 2:캡션확인 3:완료
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [target, setTarget] = useState('foreign')
  const [langs, setLangs] = useState(['en','zh','ja'])
  const [caption, setCaption] = useState('')
  const [captionLoading, setCaptionLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)
  const fileRef = useRef()

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const handleGenerateCaption = async () => {
    setCaptionLoading(true)
    const shopRes = await fetch('/api/shop')
    const shop = await shopRes.json()
    const res = await fetch('/api/caption', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopName: shop.shop_name, shopLocation: shop.shop_location, shopType: shop.shop_type }),
    })
    const data = await res.json()
    setCaptionLoading(false)
    setCaption(data.result || '')
    setStep(2)
  }

  const handleUpload = async () => {
    if (!file) return alert('영상 파일을 선택해 주세요')
    setUploading(true)
    const form = new FormData()
    form.append('video', file)
    form.append('caption', caption)
    form.append('title', `고랑AI 업로드 - ${new Date().toLocaleDateString('ko')}`)

    const res = await fetch('/api/upload/youtube', { method: 'POST', body: form })
    const data = await res.json()
    setUploading(false)
    if (data.ok) {
      setResult(data)
      setStep(3)
    } else {
      alert('업로드 실패: ' + (data.detail || data.error))
    }
  }

  const toggleLang = (l) => setLangs(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l])

  if (step === 3) return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'40px 28px', textAlign:'center' }}>
      <div style={{ fontSize:48, marginBottom:16 }}>✅</div>
      <div style={{ fontSize:22, fontWeight:700, color:'#1A2421', marginBottom:6 }}>업로드 완료!</div>
      <div style={{ fontSize:14, color:'#6B7875', lineHeight:1.7, marginBottom:24 }}>유튜브 쇼츠에 업로드됐어요</div>
      {result?.youtubeUrl && (
        <a href={result.youtubeUrl} target="_blank" rel="noopener noreferrer"
          style={{ display:'block', background:'#E1F5EE', border:'1.5px solid #5DCAA5', borderRadius:12, padding:'12px 16px', marginBottom:20, textDecoration:'none', width:'100%' }}>
          <div style={{ fontSize:12, color:'#6B7875' }}>유튜브 업로드 확인</div>
          <div style={{ fontSize:13, fontWeight:600, color:'#1D9E75', marginTop:2 }}>▶️ {result.youtubeUrl}</div>
        </a>
      )}
      <PrimaryBtn onClick={() => { setStep(1); setFile(null); setPreview(null); setCaption('') }}>+ 또 다른 영상 만들기</PrimaryBtn>
      <GhostBtn onClick={() => router.push('/home')} style={{ marginTop:8 }}>홈으로</GhostBtn>
    </div>
  )

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
      <TopBar title="영상 만들기" sub={step === 1 ? '영상 파일을 올려주세요' : '캡션을 확인해 주세요'} />
      <div style={{ flex:1, padding:'0 18px 24px', overflowY:'auto' }}>

        {step === 1 && (
          <>
            <input ref={fileRef} type="file" accept="video/*,image/*" style={{ display:'none' }} onChange={handleFile} />
            <div onClick={() => fileRef.current.click()}
              style={{ border:'2px dashed #B0BAB6', borderRadius:14, padding:'28px 16px', textAlign:'center', marginBottom:14, cursor:'pointer', background:'#F4F6F5' }}>
              {preview ? (
                <video src={preview} style={{ width:'100%', borderRadius:8, maxHeight:160, objectFit:'cover' }} controls />
              ) : (
                <>
                  <div style={{ fontSize:28, marginBottom:6 }}>☁️</div>
                  <div style={{ fontSize:13, color:'#6B7875' }}>영상 또는 사진 업로드</div>
                  <div style={{ fontSize:11, color:'#B0BAB6', marginTop:3 }}>MP4, MOV, JPG · 최대 500MB</div>
                </>
              )}
            </div>

            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, color:'#6B7875', fontWeight:500, marginBottom:8 }}>타겟 관광객</div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {[{v:'foreign',l:'🌏 외국 관광객'},{v:'korean',l:'🇰🇷 한국 관광객'},{v:'all',l:'전체'}].map(t => (
                  <button key={t.v} onClick={() => setTarget(t.v)}
                    style={{ padding:'6px 12px', borderRadius:20, border:`1.5px solid ${target===t.v?'#5DCAA5':'#E6EAE8'}`, background: target===t.v?'#E1F5EE':'#fff', color: target===t.v?'#0F6E56':'#6B7875', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'Noto Sans KR, sans-serif' }}>
                    {t.l}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, color:'#6B7875', fontWeight:500, marginBottom:8 }}>자막 언어</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                {[{v:'en',l:'🇺🇸 영어'},{v:'zh',l:'🇨🇳 중국어'},{v:'ja',l:'🇯🇵 일본어'},{v:'ko',l:'🇰🇷 한국어'}].map(lg => (
                  <button key={lg.v} onClick={() => toggleLang(lg.v)}
                    style={{ padding:'5px 11px', borderRadius:20, border:`1.5px solid ${langs.includes(lg.v)?'#5DCAA5':'#E6EAE8'}`, background: langs.includes(lg.v)?'#E1F5EE':'#fff', color: langs.includes(lg.v)?'#0F6E56':'#6B7875', fontSize:11, fontWeight:500, cursor:'pointer', fontFamily:'Noto Sans KR, sans-serif' }}>
                    {lg.l}
                  </button>
                ))}
              </div>
            </div>

            <PrimaryBtn onClick={handleGenerateCaption} disabled={!file}>
              {!file ? '영상을 먼저 올려주세요' : '✦ AI 캡션 생성하기'}
            </PrimaryBtn>
          </>
        )}

        {step === 2 && (
          <>
            {preview && <video src={preview} style={{ width:'100%', borderRadius:12, maxHeight:160, objectFit:'cover', marginBottom:14 }} controls />}

            {captionLoading ? (
              <div style={{ background:'#E1F5EE', borderRadius:14, padding:16, border:'1.5px solid #5DCAA5', marginBottom:12 }}>
                <div style={{ fontSize:10, color:'#0F6E56', fontWeight:700, marginBottom:8 }}>✦ AI 캡션 생성 중...</div>
                <LoadingDots />
              </div>
            ) : (
              <AiBox label="✦ AI 생성 캡션 (다국어)">{caption}</AiBox>
            )}

            <div style={{ display:'flex', gap:8, marginBottom:14 }}>
              <GhostBtn onClick={handleGenerateCaption} style={{ flex:1, padding:'10px', fontSize:13 }}>↻ 다시 생성</GhostBtn>
              <button onClick={() => {
                const t = prompt('캡션을 직접 수정해 주세요:', caption)
                if (t !== null) setCaption(t)
              }} style={{ flex:1, padding:10, borderRadius:14, border:'1.5px solid #1D9E75', background:'transparent', color:'#1D9E75', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'Noto Sans KR, sans-serif' }}>
                ✎ 직접 수정
              </button>
            </div>

            <div style={{ background:'#F4F6F5', borderRadius:12, padding:'12px 14px', marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#1A2421', marginBottom:8 }}>업로드 채널</div>
              {[
                { icon:'▶️', name:'유튜브 쇼츠', status:'즉시 업로드', active:true },
                { icon:'📸', name:'인스타그램 릴스', status:'심사 후 추가 예정', active:false },
                { icon:'🎵', name:'틱톡', status:'심사 후 추가 예정', active:false },
              ].map(ch => (
                <div key={ch.name} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'4px 0', borderBottom:'1px solid #E6EAE8' }}>
                  <span>{ch.icon} {ch.name}</span>
                  <span style={{ color: ch.active ? '#1D9E75' : '#EF9F27', fontWeight:600, fontSize:11 }}>{ch.status}</span>
                </div>
              ))}
            </div>

            <PrimaryBtn onClick={handleUpload} disabled={uploading || captionLoading}>
              {uploading ? '업로드 중...' : '▶️ 유튜브 쇼츠 업로드'}
            </PrimaryBtn>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
