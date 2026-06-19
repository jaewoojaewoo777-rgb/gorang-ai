'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SplashPage() {
  const router = useRouter()

  useEffect(() => {
    fetch('/api/shop')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.shop_name?.trim()) router.replace('/home')
        else if (d?.email) router.replace('/register')
      })
      .catch(() => {})
  }, [])

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#1D9E75', padding:'40px 28px' }}>
      <div style={{ width:72, height:72, borderRadius:22, background:'rgba(255,255,255,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, marginBottom:18 }}>🌿</div>
      <div style={{ fontSize:32, fontWeight:900, color:'#fff', letterSpacing:'-1px', marginBottom:6, fontFamily:'Noto Sans KR, sans-serif' }}>고랑AI</div>
      <div style={{ fontSize:14, color:'rgba(255,255,255,.75)', marginBottom:48, textAlign:'center', lineHeight:1.6 }}>제주 사장님을 위한<br/>올인원 마케팅 자동화</div>
      <div style={{ display:'flex', flexDirection:'column', gap:10, width:'100%' }}>
        <Link href="/connect?flow=kakao">
          <button style={{ width:'100%', padding:16, borderRadius:14, border:'none', background:'#FEE500', color:'#3A1D1D', fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'Noto Sans KR, sans-serif' }}>
            카카오로 시작하기
          </button>
        </Link>
        <Link href="/connect">
          <button style={{ width:'100%', padding:16, borderRadius:14, border:'1.5px solid rgba(255,255,255,.3)', background:'rgba(255,255,255,.15)', color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'Noto Sans KR, sans-serif' }}>
            구글로 시작하기
          </button>
        </Link>
      </div>
      <div style={{ fontSize:11, color:'rgba(255,255,255,.45)', marginTop:20 }}>첫 30일 무료 체험 · 신용카드 불필요</div>
    </div>
  )
}
