'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

function ConnectContent() {
  const params = useSearchParams()
  const router = useRouter()
  const error = params.get('error')
  const tiktok = params.get('tiktok')
  const meta = params.get('meta')

  const [lineToken, setLineToken] = useState('')
  const [lineSaving, setLineSaving] = useState(false)
  const [lineResult, setLineResult] = useState(null)

  const errorMsg = {
    login_first:      '먼저 구글 계정으로 로그인한 뒤 시도해주세요.',
    tiktok_cancelled: '틱톡 연동이 취소됐어요.',
    tiktok_state:     '보안 확인 실패. 다시 시도해주세요.',
    tiktok_failed:    '틱톡 연동 중 오류가 발생했어요.',
    meta_cancelled:   'Meta 연동이 취소됐어요.',
    meta_state:       '보안 확인 실패. 다시 시도해주세요.',
    meta_failed:      'Meta(Instagram/Facebook) 연동 중 오류가 발생했어요.',
  }

  useEffect(() => {
    if (tiktok === 'connected' || meta === 'connected') {
      const timer = setTimeout(() => router.push('/video'), 3000)
      return () => clearTimeout(timer)
    }
  }, [tiktok, meta, router])

  const handleLineSave = async () => {
    if (!lineToken.trim()) return
    setLineSaving(true)
    setLineResult(null)
    try {
      const res = await fetch('/api/auth/line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: lineToken.trim() }),
      })
      const data = await res.json()
      if (data.ok) {
        setLineResult({ ok: true, msg: `LINE 연동 완료! (${data.botName || 'Official Account'})` })
        setLineToken('')
      } else {
        setLineResult({ ok: false, msg: data.error || '저장 실패' })
      }
    } catch {
      setLineResult({ ok: false, msg: '네트워크 오류' })
    } finally {
      setLineSaving(false)
    }
  }

  // 완료 화면 (틱톡 or Meta)
  if (tiktok === 'connected' || meta === 'connected') {
    const isMeta = meta === 'connected'
    return (
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'40px 24px', textAlign:'center' }}>
        <div style={{ fontSize:64, marginBottom:20 }}>🎉</div>
        <div style={{ fontSize:22, fontWeight:700, color:'#1A2421', marginBottom:10 }}>
          {isMeta ? 'Instagram & Facebook 연동 완료!' : '틱톡 연동 완료!'}
        </div>
        <div style={{ fontSize:14, color:'#6B7875', marginBottom:32, lineHeight:1.7 }}>
          {isMeta
            ? 'Instagram 릴스와 Facebook 페이지에 바로 업로드할 수 있어요!'
            : '틱톡 계정이 성공적으로 연동됐어요.'}
        </div>
        <div style={{ fontSize:13, color:'#B0BAB6', marginBottom:20 }}>3초 후 영상 만들기 페이지로 이동해요...</div>
        <button
          onClick={() => router.push('/video')}
          style={{ padding:'14px 32px', borderRadius:14, border:'none', background:'#1D9E75', color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'Noto Sans KR, sans-serif' }}
        >
          지금 바로 영상 만들기 →
        </button>
      </div>
    )
  }

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', padding:'40px 24px', gap:16 }}>
      <div style={{ textAlign:'center', marginBottom:8 }}>
        <div style={{ fontSize:36, marginBottom:12 }}>🔗</div>
        <div style={{ fontSize:20, fontWeight:700, color:'#1A2421', marginBottom:6 }}>계정 연동</div>
        <div style={{ fontSize:13, color:'#6B7875', lineHeight:1.6 }}>플랫폼을 연동해 영상을 원클릭으로 업로드하세요</div>
      </div>

      {error && (
        <div style={{ background:'#FCEBEB', border:'1.5px solid #F09595', borderRadius:12, padding:'12px 16px', fontSize:13, color:'#A32D2D' }}>
          {errorMsg[error] || '오류가 발생했어요. 다시 시도해주세요.'}
        </div>
      )}

      {/* 구글 (유튜브 + GBP) */}
      <div style={{ background:'#E1F5EE', border:'1.5px solid #5DCAA5', borderRadius:14, padding:16 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'#0F6E56', marginBottom:8 }}>🔵 구글 연동</div>
        {['✅ 유튜브 쇼츠/일반 자동 업로드', '✅ 구글맵스 리뷰 AI 자동 답변'].map(t => (
          <div key={t} style={{ fontSize:13, color:'#085041', marginBottom:4 }}>{t}</div>
        ))}
      </div>
      <a href="/api/auth/google" style={{ textDecoration:'none' }}>
        <button style={{ width:'100%', padding:14, borderRadius:14, border:'none', background:'#1D9E75', color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'Noto Sans KR, sans-serif' }}>
          🔵 구글 계정으로 연동하기
        </button>
      </a>

      {/* 틱톡 */}
      <a href="/api/auth/tiktok" style={{ textDecoration:'none' }}>
        <button style={{ width:'100%', padding:14, borderRadius:14, border:'none', background:'#010101', color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'Noto Sans KR, sans-serif' }}>
          🎵 TikTok 연동하기
        </button>
      </a>

      {/* Meta (Instagram + Facebook) */}
      <div style={{ background:'#F0F4FF', border:'1.5px solid #8B9FE8', borderRadius:14, padding:16 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'#3D52B5', marginBottom:8 }}>📸👥 Meta 연동 (Instagram + Facebook)</div>
        {['✅ Instagram 릴스 자동 업로드', '✅ Facebook 페이지 동영상 자동 업로드', '✅ 동남아·서양 관광객 타깃'].map(t => (
          <div key={t} style={{ fontSize:13, color:'#2A3A8C', marginBottom:4 }}>{t}</div>
        ))}
        <div style={{ fontSize:11, color:'#7B8ED6', marginTop:8 }}>※ Facebook Business 계정 + Instagram 비즈니스 계정 필요</div>
      </div>
      <a href="/api/auth/meta" style={{ textDecoration:'none' }}>
        <button style={{ width:'100%', padding:14, borderRadius:14, border:'none', background:'#1877F2', color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'Noto Sans KR, sans-serif' }}>
          📘 Instagram & Facebook 연동하기
        </button>
      </a>

      {/* LINE */}
      <div style={{ background:'#E8F9EF', border:'1.5px solid #06C755', borderRadius:14, padding:16 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'#035C26', marginBottom:8 }}>💚 LINE Official Account 연동</div>
        {['✅ LINE 팔로워에게 영상 자동 발송', '✅ 일본인 관광객 타깃'].map(t => (
          <div key={t} style={{ fontSize:13, color:'#024D20', marginBottom:4 }}>{t}</div>
        ))}
        <div style={{ fontSize:11, color:'#059E47', marginTop:8 }}>
          LINE Developers Console → 채널 선택 → Channel Access Token 복사 후 입력
        </div>
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <input
          type="password"
          placeholder="Channel Access Token 입력"
          value={lineToken}
          onChange={e => setLineToken(e.target.value)}
          style={{ flex:1, padding:'12px 14px', borderRadius:12, border:'1.5px solid #D0D8D4', fontSize:13, fontFamily:'Noto Sans KR, sans-serif', outline:'none' }}
        />
        <button
          onClick={handleLineSave}
          disabled={lineSaving || !lineToken.trim()}
          style={{ padding:'12px 20px', borderRadius:12, border:'none', background: lineSaving ? '#5DCAA5' : '#06C755', color:'#fff', fontSize:14, fontWeight:700, cursor: lineSaving ? 'not-allowed' : 'pointer', whiteSpace:'nowrap', fontFamily:'Noto Sans KR, sans-serif' }}
        >
          {lineSaving ? '확인 중...' : '저장'}
        </button>
      </div>
      {lineResult && (
        <div style={{ padding:'10px 14px', borderRadius:10, background: lineResult.ok ? '#E1F5EE' : '#FCEBEB', fontSize:13, color: lineResult.ok ? '#085041' : '#A32D2D' }}>
          {lineResult.ok ? '✅ ' : '❌ '}{lineResult.msg}
        </div>
      )}

      <div style={{ fontSize:11, color:'#B0BAB6', textAlign:'center', marginTop:4 }}>
        ※ 구글 로그인 후 다른 플랫폼을 연동할 수 있어요
      </div>
    </div>
  )
}

export default function ConnectPage() {
  return (
    <Suspense fallback={<div style={{padding:40, textAlign:'center', color:'#B0BAB6'}}>로딩 중...</div>}>
      <ConnectContent />
    </Suspense>
  )
}
