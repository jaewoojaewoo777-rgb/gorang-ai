'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BottomNav, Card, PrimaryBtn } from '../../components/ui'

export default function SettingsPage() {
  const router = useRouter()
  const [shop, setShop] = useState({})
  const [busy, setBusy] = useState(null)   // 연동해제 처리중인 platform key

  const loadShop = () => fetch('/api/shop').then(r => r.json()).then(setShop).catch(() => {})
  useEffect(() => { loadShop() }, [])

  // 모든 플랫폼 공통 — 틱톡과 동일한 '연동해제' 방식으로 통일
  const CONNECTIONS = [
    { key: 'google',      icon: '▶️', name: 'YouTube · 구글리뷰',   connected: !!shop.google_connected,       reconnect: () => { window.location.href = '/api/auth/google?reauth=1' } },
    { key: 'instagram',   icon: '📸', name: '인스타그램 · 페이스북', connected: !!shop.instagram_user_id,       reconnect: () => { window.location.href = '/api/auth/meta' } },
    { key: 'tiktok',      icon: '🎵', name: 'TikTok',               connected: !!shop.tiktok_open_id,          reconnect: () => { window.location.href = '/api/auth/tiktok' } },
    { key: 'line',        icon: '💚', name: 'LINE',                 connected: !!shop.line_connected,          reconnect: () => router.push('/connect') },
    { key: 'tripadvisor', icon: '🦉', name: '트립어드바이저',        connected: !!shop.tripadvisor_location_id, reconnect: () => router.push('/connect') },
  ]

  async function handleDisconnect(key, name) {
    if (!confirm(`${name} 연동을 해제하시겠어요?\n해제 후 다시 연동할 수 있습니다.`)) return
    setBusy(key)
    try {
      const res = await fetch('/api/connections/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: key }),
      })
      if (res.ok) {
        await loadShop()
        alert(`${name} 연동이 해제되었습니다.`)
      } else {
        alert('연동 해제에 실패했습니다. 다시 시도해주세요.')
      }
    } catch (e) {
      alert('오류가 발생했습니다.')
    } finally {
      setBusy(null)
    }
  }

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

          {CONNECTIONS.map((c, i) => (
            <div key={c.key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 0', borderBottom: i < CONNECTIONS.length - 1 ? '1px solid #F4F6F5' : 'none' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span>{c.icon}</span>
                <span style={{ fontSize:13, color:'#1A2421' }}>{c.name}</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:11, color: c.connected ? '#1D9E75' : '#B0BAB6', fontWeight:600 }}>
                  {c.connected ? '✓ 연동됨' : '연동 필요'}
                </span>
                {c.connected ? (
                  <button onClick={() => handleDisconnect(c.key, c.name)} disabled={busy === c.key}
                    style={{ fontSize:10, color:'#fff', background:'#E53935', border:'none', borderRadius:6, padding:'3px 8px', cursor:'pointer', fontWeight:600, fontFamily:'Noto Sans KR, sans-serif' }}>
                    {busy === c.key ? '해제중...' : '연동해제'}
                  </button>
                ) : (
                  <button onClick={c.reconnect}
                    style={{ fontSize:10, color:'#fff', background:'#1D9E75', border:'none', borderRadius:6, padding:'3px 8px', cursor:'pointer', fontWeight:600, fontFamily:'Noto Sans KR, sans-serif' }}>
                    연동하기
                  </button>
                )}
              </div>
            </div>
          ))}
        </Card>

        <div style={{ background:'#F4F6F5', borderRadius:14, padding:'14px 16px', marginBottom:12 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#6B7875', marginBottom:8 }}>플랜 업그레이드</div>
          {[
            { name:'프로', price:'129,000원/월', desc:'4K AI 영상 · 월 8개', color:'#534AB7' },
            { name:'엔터프라이즈', price:'별도 문의', desc:'거래처 영상팀 + 전담 매니저', color:'#EF9F27' },
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
