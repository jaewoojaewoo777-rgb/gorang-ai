'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BottomNav, Card, PrimaryBtn } from '../../components/ui'

export default function SettingsPage() {
  const router = useRouter()
  const [shop, setShop] = useState({})
  const [busy, setBusy] = useState(null)
  const [voiceGuideOpen, setVoiceGuideOpen] = useState(false)
  const [voiceSaving, setVoiceSaving] = useState(false)
  const [voice, setVoice] = useState({ character: '', mannerism: '', closing: '', forbidden: '' })

  const loadShop = () => fetch('/api/shop').then(r => r.json()).then(d => {
    setShop(d)
    if (d.brand_voice) {
      try { setVoice(typeof d.brand_voice === 'string' ? JSON.parse(d.brand_voice) : d.brand_voice) } catch {}
    }
  }).catch(() => {})
  useEffect(() => { loadShop() }, [])

  // 모든 플랫폼 공통 — 틱톡과 동일한 '연동해제' 방식으로 통일
  const CONNECTIONS = [
    { key: 'google',      icon: '▶️', name: 'YouTube · 구글리뷰',   connected: !!shop.google_connected,       reconnect: () => { window.location.href = '/api/auth/google?reauth=1' } },
    { key: 'instagram',   icon: '📸', name: '인스타그램 · 페이스북', connected: !!shop.instagram_user_id,       reconnect: () => { window.location.href = '/api/auth/meta' } },
    { key: 'tiktok',      icon: '🎵', name: 'TikTok',               connected: !!shop.tiktok_open_id,          reconnect: () => { window.location.href = '/api/auth/tiktok' } },
    { key: 'line',        icon: '💚', name: 'LINE',                 connected: !!shop.line_connected,          reconnect: () => router.push('/connect') },
    { key: 'tripadvisor', icon: '🦉', name: '트립어드바이저',        connected: !!shop.tripadvisor_location_id, reconnect: () => router.push('/connect') },
  ]

  async function saveVoice() {
    setVoiceSaving(true)
    await fetch('/api/shop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandVoice: JSON.stringify(voice) }),
    })
    setVoiceSaving(false)
    alert('나만의 말투가 저장되었습니다!')
  }

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

        {/* ── 나만의 말투 ── */}
        <Card style={{ marginBottom:12 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#1A2421', marginBottom:8 }}>🎤 나만의 말투</div>

          {/* 안내 토글 */}
          <button onClick={() => setVoiceGuideOpen(o => !o)}
            style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#F4F6F5', border:'none', borderRadius:8, padding:'8px 10px', cursor:'pointer', marginBottom:10 }}>
            <span style={{ fontSize:11, fontWeight:600, color:'#0F6E56' }}>왜 설정하면 좋을까요? (작성 요령 보기)</span>
            <span style={{ fontSize:12, color:'#6B7875' }}>{voiceGuideOpen ? '▲' : '▼'}</span>
          </button>
          {voiceGuideOpen && (
            <div style={{ background:'#F4F6F5', borderRadius:8, padding:'10px 12px', marginBottom:10, fontSize:11, color:'#444', lineHeight:1.8 }}>
              <div style={{ fontWeight:700, color:'#0F6E56', marginBottom:4 }}>✅ 설정하면 좋은 이유</div>
              <div>• AI가 항상 우리 가게만의 목소리로 자막을 생성해요</div>
              <div>• 영상마다 톤이 일관되어 브랜드가 더 빨리 각인돼요</div>
              <div>• 캡션 생성 시 "나만의 말투" 선택만 하면 자동 적용돼요</div>
              <div style={{ fontWeight:700, color:'#0F6E56', margin:'8px 0 4px' }}>📝 작성 요령</div>
              <div>• <b>캐릭터</b>: 어떤 사람이 말하는 느낌인지 간단히<br/>
                예) "따뜻하고 친근한 30대 카페 주인"<br/>
                예) "장년의 걸걸하고 능청스러운 제주 삼촌"</div>
              <div style={{ marginTop:4 }}>• <b>말버릇/어미</b>: 자주 쓸 표현이나 어미<br/>
                예) "~해요, ~랍니다, 이모지 자주"<br/>
                예) "~하지, ~거든, 어~ 같은 추임새"</div>
              <div style={{ marginTop:4 }}>• <b>클로징 멘트</b>: 매 영상 마지막에 고정으로 붙을 한 줄<br/>
                예) "오늘도 맛있는 하루 🌿"<br/>
                예) "또 놀러 와요~ 🏡"</div>
              <div style={{ marginTop:4 }}>• <b>금지 표현</b>: AI가 절대 쓰지 말아야 할 문구<br/>
                예) "여러분 안녕하세요, 소개해드릴"</div>
            </div>
          )}

          {[
            { key:'character', label:'캐릭터 설명', placeholder:'예) 따뜻하고 친근한 30대 카페 주인장' },
            { key:'mannerism', label:'말버릇 / 어미', placeholder:'예) ~해요, ~랍니다, 이모지 자주' },
            { key:'closing',   label:'클로징 멘트', placeholder:'예) 오늘도 맛있는 하루 🌿' },
            { key:'forbidden', label:'금지 표현', placeholder:'예) 여러분 안녕하세요, 소개해드릴' },
          ].map(f => (
            <div key={f.key} style={{ marginBottom:8 }}>
              <div style={{ fontSize:11, fontWeight:600, color:'#6B7875', marginBottom:3 }}>{f.label}</div>
              <input
                value={voice[f.key]}
                onChange={e => setVoice(v => ({ ...v, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1.5px solid #E6EAE8', fontSize:12, fontFamily:'Noto Sans KR, sans-serif', boxSizing:'border-box', outline:'none', color:'#1A2421' }}
              />
            </div>
          ))}

          <button onClick={saveVoice} disabled={voiceSaving}
            style={{ width:'100%', padding:'10px', borderRadius:10, border:'none', background:'#1D9E75', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'Noto Sans KR, sans-serif', marginTop:4 }}>
            {voiceSaving ? '저장 중...' : '💾 나만의 말투 저장'}
          </button>
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
