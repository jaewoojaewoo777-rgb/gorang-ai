'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TopBar, PrimaryBtn } from '../../components/ui'

export default function RegisterPage() {
  const router = useRouter()
  const [type, setType] = useState('pension')
  const [name, setName] = useState('')
  const [loc, setLoc] = useState('')
  const [intro, setIntro] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return alert('가게 이름을 입력해 주세요')
    setSaving(true)
    const res = await fetch('/api/shop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopName: name, shopType: type, shopLocation: loc, shopIntro: intro }),
    })
    setSaving(false)
    if (res.ok) router.push('/home')
    else alert('저장 실패. 다시 시도해주세요.')
  }

  const TYPES = [
    { id: 'pension',    emoji: '🏕️', label: '펜션' },
    { id: 'cafe',       emoji: '☕',  label: '카페' },
    { id: 'restaurant', emoji: '🍽️', label: '맛집' },
    { id: 'fishing',    emoji: '🎣',  label: '낚시·체험' },
  ]

  const PLACEHOLDERS = {
    pension:    { name: '예) 제주 바다펜션',       loc: '예) 서귀포시 성산읍',  intro: '예) 성산일출봉 앞 오션뷰 독채 펜션' },
    cafe:       { name: '예) 제주 돌담카페',       loc: '예) 제주시 한림읍',    intro: '예) 한라산 뷰 감성 카페' },
    restaurant: { name: '예) 제주 흑돼지 맛집',   loc: '예) 제주시 연동',      intro: '예) 30년 전통 제주 흑돼지 전문점' },
    fishing:    { name: '예) 제주 선상낚시 투어',  loc: '예) 서귀포시 대포항',  intro: '예) 당일 선상낚시 + 회 포장 서비스' },
  }

  const ph = PLACEHOLDERS[type]

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
      <TopBar title="가게 등록" sub="기본 정보를 입력해 주세요" onBack={() => router.push('/connect')} />
      <div style={{ flex:1, padding:'0 18px 24px', overflowY:'auto' }}>

        {/* 업종 선택 */}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, color:'#6B7875', fontWeight:500, marginBottom:8 }}>업종 선택</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {TYPES.map(t => (
              <div key={t.id} onClick={() => setType(t.id)}
                style={{
                  border: type===t.id ? '2px solid #1D9E75' : '1.5px solid #E6EAE8',
                  borderRadius: 14,
                  padding: '18px 10px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: type===t.id ? '#E1F5EE' : '#fff',
                }}>
                <div style={{ fontSize:32, marginBottom:6 }}>{t.emoji}</div>
                <div style={{ fontSize:14, fontWeight:700, color: type===t.id ? '#0F6E56' : '#6B7875' }}>{t.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 입력 필드 */}
        {[
          { label:'가게 이름',       val:name,  set:setName,  placeholder: ph.name },
          { label:'위치',            val:loc,   set:setLoc,   placeholder: ph.loc },
          { label:'한줄 소개 (선택)', val:intro, set:setIntro, placeholder: ph.intro },
        ].map(f => (
          <div key={f.label} style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, color:'#6B7875', fontWeight:500, marginBottom:5 }}>{f.label}</div>
            <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
              style={{ width:'100%', padding:'13px 14px', borderRadius:10, border:'1.5px solid #E6EAE8', fontSize:14, fontFamily:'Noto Sans KR, sans-serif', color:'#1A2421', outline:'none' }} />
          </div>
        ))}

        <PrimaryBtn onClick={handleSave} disabled={saving}>{saving ? '저장 중...' : '등록 완료 →'}</PrimaryBtn>
      </div>
    </div>
  )
}
