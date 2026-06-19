'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BottomNav, Card, PrimaryBtn } from '../../components/ui'

export default function SettingsPage() {
  const router = useRouter()
  const [shop, setShop] = useState({})

  useEffect(() => {
    fetch('/api/shop').then(r => r.json()).then(setShop).catch(() => {})
  }, [])

  // 실제 연동 상태 판별
  const gbConnected = !!(shop.gbp_location_id || shop.gbp_account_id)
  const ttConnected = !!shop.tiktok_open_id

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
      <div style={{ padding:'18px 18px 12px' }}>
        <div style={{ fontSize:18, fontWeight:700, color:'#1A2421' }}>⚙️ 설정</div>
      </div>
      <div style={{ flex:1, padding:'4px 18px 24px', overflowY:'auto' }}>
        <Card teal style={{ marginBottom:12 }}>
          <div style={{ fontSize:11, color:'#0F6E56', fontWeight:600, marginBottom:2 }}>현재 플랜</div>
          <div style={{ fontSize:18, fontWeight:700, color:'#0F6E56' }}>스탠다드</div>
          <div style={{ fontSize:11, color:'#085041' }}>월 59,000원</div>
        </Card>

        <Card style={{ marginBottom:12 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#1A2421', marginBottom:8 }}>가게 정보</div>
          <div style={{ fontSize:13, color:'#6B7875', marginBottom:2 }}>{shop.shop_name || '—'}</div>
          <div style={{ fontSize:12, color:'#B0BAB6', marginBottom:8 }}>{shop.shop_location || '—'}</div>
          <button onClick={() => router.push('/register')}
            style={{ fontSize:12, color:'#1D9E75', fontWeight:600, background:'none', border:'none', cursor:'pointer', padding:0 }}>수정하기 →</button>
        </Card>

        <Card style={{ marginBottom:12 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#1A2421', marginBottom:10 }}>연동된 계정</div>
          {[
            { icon:'🔵', name:'Google 비즈니스', status: gbConnected ? '✓ 연동됨' : '연동 필요', color: gbConnected ? '#1D9E75' : '#B0BAB6' },
            { icon:'📸', name:'Instagram', status:'심사 중', color:'#EF9F27' },
            { icon:'🎵', name:'TikTok', status: ttConnected ? '✓ 연동됨' : '연동 필요', color: ttConnected ? '#1D9E75' : '#B0BAB6' },
          ].map(ch => (
            <div key={ch.name} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid #F4F6F5' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span>{ch.icon}</span>
                <span style={{ fontSize:13, color:'#1A2421' }}>{ch.name}</span>
              </div>
              <span style={{ fontSize:11, color:ch.color, fontWeight:600 }}>{ch.status}</span>
            </div>
          ))}
          <button onClick={() => router.push('/connect')}
            style={{ fontSize:12, color:'#1D9E75', fontWeight:600, background:'none', border:'none', cursor:'pointer', padding:'8px 0 0', fontFamily:'Noto Sans KR, sans-serif' }}>
            계정 추가 연동 →
          </button>
        </Card>

        <div style={{ background:'#F4F6F5', borderRadius:14, padding:'14px 16px', marginBottom:12 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#6B7875', marginBottom:8 }}>플랜 업그레이드</div>
          {[
            { name:'프로', price:'129,000원/월', desc:'4K AI 영상 · 월 8개', color:'#534AB7', bg:'#EEEDFE' },
            { name:'엔터프라이즈', price:'별도 문의', desc:'거래처 영상팀 + 전담 매니저', color:'#EF9F27', bg:'#FAEEDA' },
          ].map(p => (
            <div key={p.name} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid #E6EAE8' }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:'#1A2421' }}>{p.name}</div>
                <div style={{ fontSize:11, color:'#B0BAB6' }}>{p.desc}</div>
              </div>
              <div style={{ fontSize:12, fontWeight:700, color:p.color }}>{p.price}</div>
            </div>
          ))}
        </div>

        <button onClick={() => router.push('/help')}
          style={{ width:'100%', padding:14, borderRadius:14, border:'1.5px solid #E6EAE8', background:'#fff', color:'#1A2421', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'Noto Sans KR, sans-serif', marginBottom:12, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span>💬 도움말 · 사용법 문의</span>
          <span style={{ color:'#B0BAB6' }}>›</span>
        </button>

        <button onClick={() => { if(confirm('로그아웃 하시겠어요?')) window.location.href = '/api/auth/logout' }}
          style={{ width:'100%', padding:14, borderRadius:14, border:'1.5px solid #E6EAE8', background:'#fff', color:'#6B7875', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'Noto Sans KR, sans-serif' }}>
          로그아웃
        </button>
      </div>
      <BottomNav />
    </div>
  )
}
