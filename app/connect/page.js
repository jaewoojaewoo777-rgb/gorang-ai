'use client'
import { Suspense, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

function ConnectContent() {
  const params = useSearchParams()
  const router = useRouter()
  const error = params.get('error')
  const tiktok = params.get('tiktok')

  const errorMsg = {
    cancelled: '연동이 취소됐어요. 다시 시도해주세요.',
    failed: '연동 중 오류가 발생했어요. 다시 시도해주세요.',
    login_first: '먼저 구글 계정으로 로그인한 뒤 틱톡을 연동해주세요.',
    tiktok_cancelled: '틱톡 연동이 취소됐어요. 다시 시도해주세요.',
    tiktok_state: '보안 확인에 실패했어요. 다시 시도해주세요.',
    tiktok_failed: '틱톡 연동 중 오류가 발생했어요. 다시 시도해주세요.',
  }

  // 틱톡 연동 완료 시 3초 후 영상 만들기 페이지로 이동
  useEffect(() => {
    if (tiktok === 'connected') {
      const timer = setTimeout(() => {
        router.push('/video')
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [tiktok, router])

  // 틱톡 연동 완료 화면
  if (tiktok === 'connected') {
    return (
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'40px 24px', textAlign:'center' }}>
        <div style={{ fontSize:64, marginBottom:20 }}>🎉</div>
        <div style={{ fontSize:22, fontWeight:700, color:'#1A2421', marginBottom:10 }}>틱톡 연동 완료!</div>
        <div style={{ fontSize:14, color:'#6B7875', marginBottom:32, lineHeight:1.7 }}>
          틱톡 계정이 성공적으로 연동됐어요.<br/>
          이제 영상을 만들고 틱톡에 바로 업로드할 수 있어요!
        </div>
        <div style={{ background:'#E1F5EE', border:'1.5px solid #5DCAA5', borderRadius:14, padding:'16px 24px', marginBottom:32, width:'100%', maxWidth:320 }}>
          {['✅ 틱톡 자동 업로드', '✅ 영상 제작 + 바로 게시', '✅ 한·영·중·일 자막 자동 생성'].map(t => (
            <div key={t} style={{ fontSize:13, color:'#085041', marginBottom:6 }}>{t}</div>
          ))}
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
    <div style={{ flex:1, display:'flex', flexDirection:'column', padding:'40px 24px' }}>
      <div style={{ textAlign:'center', marginBottom:32 }}>
        <div style={{ fontSize:36, marginBottom:12 }}>🔗</div>
        <div style={{ fontSize:20, fontWeight:700, color:'#1A2421', marginBottom:6 }}>계정 연동</div>
        <div style={{ fontSize:13, color:'#6B7875', lineHeight:1.6 }}>구글 계정 하나로<br/>유튜브 업로드 + 구글 리뷰 관리가 돼요</div>
      </div>

      {error && (
        <div style={{ background:'#FCEBEB', border:'1.5px solid #F09595', borderRadius:12, padding:'12px 16px', marginBottom:16, fontSize:13, color:'#A32D2D' }}>
          {errorMsg[error] || '오류가 발생했어요. 다시 시도해주세요.'}
        </div>
      )}

      <div style={{ background:'#E1F5EE', border:'1.5px solid #5DCAA5', borderRadius:14, padding:16, marginBottom:20 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'#0F6E56', marginBottom:8 }}>구글 연동 시 사용 가능한 기능</div>
        {['✅ 구글맵스 리뷰 AI 자동 답변', '✅ 유튜브 쇼츠 자동 업로드', '✅ 4개 언어 AI 캡션 생성'].map(t => (
          <div key={t} style={{ fontSize:13, color:'#085041', marginBottom:4 }}>{t}</div>
        ))}
      </div>

      <a href="/api/auth/google" style={{ textDecoration:'none' }}>
        <button style={{ width:'100%', padding:16, borderRadius:14, border:'none', background:'#1D9E75', color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'Noto Sans KR, sans-serif', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          🔵 구글 계정으로 연동하기
        </button>
      </a>

      <a href="/api/auth/tiktok" style={{ textDecoration:'none' }}>
        <button style={{ width:'100%', padding:16, borderRadius:14, border:'none', background:'#010101', color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'Noto Sans KR, sans-serif', display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginTop:12 }}>
          🎵 틱톡 계정 연동하기
        </button>
      </a>
      <div style={{ fontSize:11, color:'#B0BAB6', textAlign:'center', marginTop:6 }}>※ 구글 로그인 후 이용할 수 있어요</div>

      <div style={{ marginTop:20, padding:'14px 16px', background:'#F4F6F5', borderRadius:14 }}>
        <div style={{ fontSize:11, fontWeight:700, color:'#6B7875', marginBottom:6 }}>📋 인스타그램 연동</div>
        <div style={{ fontSize:12, color:'#B0BAB6', lineHeight:1.6 }}>현재 Meta 앱 심사 진행 중이에요.<br/>심사 완료 후 이 화면에서 연동할 수 있어요.</div>
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
