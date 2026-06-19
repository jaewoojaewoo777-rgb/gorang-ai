'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BottomNav, Card, StatCard, PrimaryBtn } from '../../components/ui'

export default function HomePage() {
  const router = useRouter()
  const [shop, setShop] = useState({})
  const [reviews, setReviews] = useState([])

  useEffect(() => {
    fetch('/api/shop').then(r => r.json()).then(setShop).catch(() => {})
    fetch('/api/reviews').then(r => r.json()).then(d => setReviews(d.reviews || [])).catch(() => {})
  }, [])

  const pending = reviews.filter(r => !r.hasReply).length
  const langCount = { en:0, zh:0, ko:0, ja:0 }
  reviews.filter(r => !r.hasReply).forEach(r => { if(langCount[r.detectedLang] !== undefined) langCount[r.detectedLang]++ })

  const langLabel = Object.entries(langCount).filter(([,v]) => v > 0)
    .map(([k,v]) => ({ en:'🇺🇸', zh:'🇨🇳', ko:'🇰🇷', ja:'🇯🇵' }[k] + ` ${v}건`).join(' · '))

  // 실제 연동 상태 (하드코딩 X — /api/shop 값으로 판별)
  const gbConnected = !!(shop.gbp_location_id || shop.gbp_account_id)
  const ttConnected = !!shop.tiktok_open_id
  const igConnected = !!shop.instagram_user_id
  const taConnected = !!shop.tripadvisor_location_id

  const channels = [
    {
      icon: '🔵', name: 'Google 비즈니스',
      sub: gbConnected ? '리뷰 답변 · 구글맵' : '연동이 필요해요',
      connected: gbConnected, review: false,
    },
    {
      icon: '▶️', name: 'YouTube',
      sub: gbConnected ? '쇼츠 자동 업로드' : '구글 연동 시 자동 사용',
      connected: gbConnected, review: false,
    },
    {
      icon: '📸', name: 'Instagram',
      sub: '앱 심사 중...', connected: false, review: true,
    },
    {
      icon: '📘', name: 'Facebook',
      sub: '앱 심사 중...', connected: false, review: true,
    },
    {
      icon: '🎵', name: 'TikTok',
      sub: ttConnected ? (shop.tiktok_display_name || '영상 자동 업로드') : '탭해서 연동하기',
      connected: ttConnected, review: false,
    },
    {
      icon: '🦉', name: 'TripAdvisor',
      sub: taConnected ? (shop.tripadvisor_location_name || '리뷰 알림 수신 중') : '탭해서 연동하기',
      connected: taConnected, review: false,
    },
    {
      icon: '🇨🇳', name: 'RedNote',
      sub: '탭해서 연동하기', connected: false, review: false,
    },
  ]

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
      <div style={{ padding:'20px 18px 12px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div style={{ fontSize:12, color:'#B0BAB6' }}>안녕하세요 👋</div>
          <div style={{ fontSize:20, fontWeight:700, color:'#1A2421' }}>{shop.shop_name || '내 가게'}</div>
        </div>
        <div style={{ width:38, height:38, borderRadius:'50%', background:'#F4F6F5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🔔</div>
      </div>

      <div style={{ flex:1, padding:'4px 18px 16px', overflowY:'auto' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
          <StatCard value={pending || 0} label="새 리뷰 대기" green={pending > 0} />
          <StatCard value={reviews.length} label="총 리뷰 수" />
        </div>

        {pending > 0 && (
          <Card teal style={{ marginBottom:10 }}>
            <div style={{ fontSize:12, color:'#0F6E56', fontWeight:700, marginBottom:4 }}>📬 답변 대기 리뷰 {pending}건</div>
            <div style={{ fontSize:11, color:'#085041', marginBottom:8 }}>
              {Object.entries(langCount).filter(([,v]) => v > 0).map(([k,v]) => ({ en:'🇺🇸 영어', zh:'🇨🇳 중국어', ko:'🇰🇷 한국어', ja:'🇯🇵 일본어' }[k] + ` ${v}건`)).join(' · ')}
            </div>
            <button onClick={() => router.push('/review')}
              style={{ padding:'7px 16px', borderRadius:8, border:'none', background:'#1D9E75', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'Noto Sans KR, sans-serif' }}>
              지금 답변하기 →
            </button>
          </Card>
        )}

        <Card style={{ marginBottom:12 }}>
          <div style={{ fontSize:12, color:'#6B7875', fontWeight:600, marginBottom:8 }}>연동된 채널</div>
          {channels.map((ch, i) => {
            const clickable = !ch.connected && !ch.review
            const isLast = i === channels.length - 1
            return (
              <div key={ch.name}
                onClick={clickable ? () => router.push('/connect') : undefined}
                style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 0', borderBottom: isLast ? 'none' : '1px solid #F4F6F5', cursor: clickable ? 'pointer' : 'default' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:18 }}>{ch.icon}</span>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:'#1A2421' }}>{ch.name}</div>
                    <div style={{ fontSize:10, color:'#B0BAB6' }}>{ch.sub}</div>
                  </div>
                </div>
                <span style={{ fontSize:10, fontWeight:600, color: ch.connected ? '#1D9E75' : ch.review ? '#EF9F27' : '#1D9E75' }}>
                  {ch.connected ? '✓ 연동됨' : ch.review ? '심사중' : '연동하기 →'}
                </span>
              </div>
            )
          })}
        </Card>

        <PrimaryBtn onClick={() => router.push('/video')}>+ 새 영상 만들기</PrimaryBtn>

        <button onClick={() => router.push('/help')}
          style={{ width:'100%', marginTop:10, padding:'12px', borderRadius:14, border:'1.5px solid #E6EAE8', background:'#fff', color:'#6B7875', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'Noto Sans KR, sans-serif', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
          💬 도움말 · 사용법이 궁금하세요?
        </button>
      </div>
      <BottomNav />
    </div>
  )
}
