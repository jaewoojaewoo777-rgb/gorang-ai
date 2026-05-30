'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { BottomNav, TopBar, PrimaryBtn, GhostBtn, AiBox, LoadingDots } from '../../components/ui'

export default function VideoPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [files, setFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [caption, setCaption] = useState('')
  const [captionLoading, setCaptionLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)
  const fileRef = useRef()

  const handleFiles = (e) => {
    const selected = Array.from(e.target.files)
    if (!selected.length) return
    setFiles(prev => [...prev, ...selected])
    const newPreviews = selected.map(f => URL.createObjectURL(f))
    setPreviews(prev => [...prev, ...newPreviews])
  }

  const removeFile = (idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx))
    setPreviews(prev => prev.filter((_, i) => i !== idx))
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
    if (!files.length) return alert('파일을 먼저 추가해 주세요')
    // 영상 파일 찾기 (없으면 첫 번째 파일 사용)
    const videoFile = files.find(f => f.type.startsWith('video/')) || files[0]
    setUploading(true)
    const form = new FormData()
    form.append('video', videoFile)
    form.append('caption', caption)
    form.append('title', `고랑AI - ${new Date().toLocaleDateString('ko')}`)
    const res = await fetch('/api/upload/youtube', { method: 'POST', body: form })
    const data = await res.json()
    setUploading(false)
    if (data.ok) { setResult(data); setStep(3) }
    else alert('업로드 실패: ' + (data.detail || data.error))
  }

  if (step === 3) return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'40px 28px', textAlign:'center' }}>
      <div style={{ fontSize:48, marginBottom:16 }}>✅</div>
      <div style={{ fontSize:22, fontWeight:700, color:'#1A2421', marginBottom:6 }}>업로드 완료!</div>
      <div style={{ fontSize:14, color:'#6B7875', lineHeight:1.7, marginBottom:24 }}>유튜브 쇼츠에 업로드됐어요</div>
      {result?.youtubeUrl && (
        <a href={result.youtubeUrl} target="_blank" rel="noopener noreferrer"
          style={{ display:'block', background:'#E1F5EE', border:'1.5px solid #5DCAA5', borderRadius:12, padding:'12px 16px', marginBottom:20, textDecoration:'none', width:'100%' }}>
          <div style={{ fontSize:12, color:'#6B7875' }}>유튜브에서 확인하기</div>
          <div style={{ fontSize:13, fontWeight:600, color:'#1D9E75', marginTop:2 }}>▶️ YouTube Shorts 바로가기</div>
        </a>
      )}
      <PrimaryBtn onClick={() => { setStep(1); setFiles([]); setPreviews([]); setCaption('') }}>+ 또 다른 영상 만들기</PrimaryBtn>
      <GhostBtn onClick={() => router.push('/home')} style={{ marginTop:8 }}>홈으로</GhostBtn>
    </div>
  )

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
      <TopBar title="영상 만들기" sub={step === 1 ? '사진·영상을 올려주세요' : '캡션 확인 후 업로드'} />
      <div style={{ flex:1, padding:'0 18px 24px', overflowY:'auto' }}>

        {step === 1 && (
          <>
            {/* 파일 추가 버튼 */}
            <input ref={fileRef} type="file" accept="video/*,image/*" multiple style={{ display:'none' }} onChange={handleFiles} />
            <div onClick={() => fileRef.current.click()}
              style={{ border:'2px dashed #B0BAB6', borderRadius:14, padding:'20px 16px', textAlign:'center', marginBottom:12, cursor:'pointer', background:'#F4F6F5' }}>
              <div style={{ fontSize:28, marginBottom:4 }}>☁️</div>
              <div style={{ fontSize:13, color:'#6B7875', fontWeight:600 }}>사진·영상 추가하기</div>
              <div style={{ fontSize:11, color:'#B0BAB6', marginTop:3 }}>여러 장 동시 선택 가능 · MP4, MOV, JPG, PNG</div>
            </div>

            {/* 미리보기 그리드 */}
            {previews.length > 0 && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:14 }}>
                {previews.map((p, i) => (
                  <div key={i} style={{ position:'relative', borderRadius:10, overflow:'hidden', aspectRatio:'1', background:'#F4F6F5' }}>
                    {files[i]?.type.startsWith('video/') ? (
                      <video src={p} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    ) : (
                      <img src={p} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt="" />
                    )}
                    <button onClick={() => removeFile(i)}
                      style={{ position:'absolute', top:4, right:4, width:22, height:22, borderRadius:'50%', background:'rgba(0,0,0,0.6)', color:'#fff', border:'none', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      ✕
                    </button>
                    {files[i]?.type.startsWith('video/') && (
                      <div style={{ position:'absolute', bottom:4, left:4, background:'rgba(0,0,0,0.6)', color:'#fff', fontSize:9, padding:'2px 5px', borderRadius:4 }}>영상</div>
                    )}
                  </div>
                ))}
                {/* 추가 버튼 */}
                <div onClick={() => fileRef.current.click()}
                  style={{ borderRadius:10, border:'2px dashed #B0BAB6', display:'flex', alignItems:'center', justifyContent:'center', aspectRatio:'1', cursor:'pointer', background:'#F4F6F5', flexDirection:'column', gap:4 }}>
                  <div style={{ fontSize:20, color:'#B0BAB6' }}>+</div>
                  <div style={{ fontSize:9, color:'#B0BAB6' }}>추가</div>
                </div>
              </div>
            )}

            <div style={{ background:'#E1F5EE', borderRadius:12, padding:'10px 14px', marginBottom:14, fontSize:12, color:'#0F6E56' }}>
              💡 영상 파일이 있으면 유튜브에 직접 업로드돼요. 사진만 있으면 AI가 캡션을 생성해줘요.
            </div>

            <PrimaryBtn onClick={handleGenerateCaption} disabled={!files.length}>
              {!files.length ? '파일을 먼저 추가해 주세요' : `✦ AI 캡션 생성하기 (${files.length}개 선택됨)`}
            </PrimaryBtn>
          </>
        )}

        {step === 2 && (
          <>
            {/* 선택된 파일 미리보기 */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6, marginBottom:14 }}>
              {previews.slice(0, 6).map((p, i) => (
                <div key={i} style={{ borderRadius:8, overflow:'hidden', aspectRatio:'1', background:'#F4F6F5' }}>
                  {files[i]?.type.startsWith('video/') ? (
                    <video src={p} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  ) : (
                    <img src={p} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt="" />
                  )}
                </div>
              ))}
            </div>

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
              <button onClick={() => { const t = prompt('캡션 수정:', caption); if(t !== null) setCaption(t) }}
                style={{ flex:1, padding:10, borderRadius:14, border:'1.5px solid #1D9E75', background:'transparent', color:'#1D9E75', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'Noto Sans KR, sans-serif' }}>
                ✎ 직접 수정
              </button>
            </div>

            <div style={{ background:'#F4F6F5', borderRadius:12, padding:'12px 14px', marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#1A2421', marginBottom:8 }}>업로드 채널</div>
              {[
                { icon:'▶️', name:'유튜브 쇼츠', status:'즉시 업로드', active:true },
                { icon:'📸', name:'인스타그램 릴스', status:'심사 후 추가', active:false },
                { icon:'🎵', name:'틱톡', status:'심사 후 추가', active:false },
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
            <GhostBtn onClick={() => setStep(1)} style={{ marginTop:8 }}>← 파일 다시 선택</GhostBtn>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
