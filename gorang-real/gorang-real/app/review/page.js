'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BottomNav, Badge, AiBox, LoadingDots, PrimaryBtn, GhostBtn } from '../../components/ui'

const STAR_MAP = { FIVE:5, FOUR:4, THREE:3, TWO:2, ONE:1 }
const LANG_FLAG = { en:'🇺🇸', zh:'🇨🇳', ko:'🇰🇷', ja:'🇯🇵' }
const LANG_NAME = { en:'영어', zh:'중국어', ko:'한국어', ja:'일본어' }

export default function ReviewPage() {
  const router = useRouter()
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [reply, setReply] = useState('')
  const [replyLoading, setReplyLoading] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [mode, setMode] = useState('approve') // approve | auto

  useEffect(() => {
    fetch('/api/reviews')
      .then(r => r.json())
      .then(d => { setReviews(d.reviews || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = reviews.filter(r => {
    if (filter === 'wait') return !r.hasReply
    if (filter === 'done') return r.hasReply
    return true
  })

  const openReview = async (r) => {
    setSelected(r)
    setReply('')
    setReplyLoading(true)
    const res = await fetch('/api/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewText: r.comment, language: r.detectedLang || 'ko' }),
    })
    const data = await res.json()
    setReply(data.result || '')
    setReplyLoading(false)
  }

  const handlePublish = async () => {
    if (!reply.trim()) return
    setPublishing(true)
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewId: selected.reviewId, replyText: reply }),
    })
    const data = await res.json()
    setPublishing(false)
    if (data.ok) {
      setReviews(prev => prev.map(r => r.reviewId === selected.reviewId ? { ...r, hasReply: true } : r))
      setSelected(null)
      alert('✅ 구글맵스에 답변이 게시됐어요!')
    } else {
      alert('답변 게시 실패: ' + (data.detail || data.error))
    }
  }

  // 리뷰 상세 화면
  if (selected) return (
    <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'18px 18px 12px' }}>
        <button onClick={() => setSelected(null)}
          style={{ width:34, height:34, borderRadius:'50%', border:'1.5px solid #E6EAE8', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color:'#6B7875', cursor:'pointer', background:'#fff' }}>
          ←
        </button>
        <div>
          <div style={{ fontSize:16, fontWeight:700, color:'#1A2421' }}>AI 답변 생성</div>
          <div style={{ fontSize:11, color:'#B0BAB6' }}>{LANG_FLAG[selected.detectedLang]} {LANG_NAME[selected.detectedLang] || ''} 리뷰</div>
        </div>
      </div>
      <div style={{ flex:1, padding:'0 18px 24px', overflowY:'auto' }}>
        <div style={{ background:'#fff', border:'1.5px solid #E6EAE8', borderRadius:14, padding:'14px 16px', marginBottom:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
            <span style={{ fontSize:13, fontWeight:600, color:'#1A2421' }}>{LANG_FLAG[selected.detectedLang]} {selected.reviewer?.displayName || '익명'}</span>
            <span style={{ fontSize:12, color:'#EF9F27' }}>{'★'.repeat(STAR_MAP[selected.starRating] || 5)}</span>
          </div>
          <div style={{ fontSize:13, color:'#6B7875', lineHeight:1.5 }}>{selected.comment}</div>
        </div>

        {replyLoading ? (
          <div style={{ background:'#E1F5EE', borderRadius:14, padding:16, border:'1.5px solid #5DCAA5', marginBottom:12 }}>
            <div style={{ fontSize:10, color:'#0F6E56', fontWeight:700, marginBottom:8 }}>✦ AI 답변 생성 중...</div>
            <LoadingDots />
          </div>
        ) : (
          <>
            <div style={{ background:'#E1F5EE', borderRadius:14, padding:14, border:'1.5px solid #5DCAA5', marginBottom:8 }}>
              <div style={{ fontSize:10, color:'#0F6E56', fontWeight:700, marginBottom:7 }}>✦ AI 생성 답변</div>
              <textarea value={reply} onChange={e => setReply(e.target.value)}
                style={{ width:'100%', background:'transparent', border:'none', outline:'none', fontSize:13, color:'#1A2421', lineHeight:1.7, fontFamily:'Noto Sans KR, sans-serif', resize:'none', minHeight:80 }} />
            </div>
            <div style={{ display:'flex', gap:8, marginBottom:14 }}>
              <GhostBtn onClick={() => openReview(selected)} style={{ flex:1, padding:10, fontSize:13 }}>↻ 다시 생성</GhostBtn>
            </div>
          </>
        )}

        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, color:'#6B7875', fontWeight:500, marginBottom:8 }}>발행 방식</div>
          <div style={{ display:'flex', gap:8 }}>
            {[{v:'approve',l:'👁️ 승인 후 발행'},{v:'auto',l:'⚡ 자동 발행'}].map(m => (
              <button key={m.v} onClick={() => setMode(m.v)}
                style={{ flex:1, padding:10, borderRadius:10, border:`1.5px solid ${mode===m.v?'#1D9E75':'#E6EAE8'}`, background: mode===m.v?'#E1F5EE':'#fff', color: mode===m.v?'#0F6E56':'#6B7875', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'Noto Sans KR, sans-serif' }}>
                {m.l}
              </button>
            ))}
          </div>
        </div>

        <PrimaryBtn onClick={handlePublish} disabled={publishing || replyLoading || !reply}>
          {publishing ? '게시 중...' : '구글맵스에 답변 게시'}
        </PrimaryBtn>
        <div style={{ fontSize:11, color:'#B0BAB6', textAlign:'center', marginTop:6 }}>답변이 구글맵스에 바로 등록돼요</div>
      </div>
    </div>
  )

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
      <div style={{ padding:'18px 18px 10px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontSize:18, fontWeight:700, color:'#1A2421' }}>구글 리뷰</div>
        <div style={{ display:'flex', gap:5 }}>
          {[{v:'all',l:'전체'},{v:'wait',l:'대기'},{v:'done',l:'완료'}].map(f => (
            <button key={f.v} onClick={() => setFilter(f.v)}
              style={{ padding:'4px 10px', borderRadius:20, border:`1.5px solid ${filter===f.v?'#5DCAA5':'#E6EAE8'}`, background: filter===f.v?'#E1F5EE':'#fff', color: filter===f.v?'#0F6E56':'#6B7875', fontSize:11, fontWeight:500, cursor:'pointer', fontFamily:'Noto Sans KR, sans-serif' }}>
              {f.l}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex:1, padding:'4px 18px 16px', overflowY:'auto' }}>
        {loading && <div style={{ textAlign:'center', padding:40, color:'#B0BAB6' }}>리뷰 불러오는 중...</div>}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign:'center', padding:40, color:'#B0BAB6' }}>
            {reviews.length === 0 ? '구글 비즈니스 계정을 연동하면\n리뷰가 여기에 나타나요' : '해당하는 리뷰가 없어요'}
          </div>
        )}
        {filtered.map(r => (
          <div key={r.reviewId} onClick={() => !r.hasReply && openReview(r)}
            style={{ padding:'10px 0', borderBottom:'1.5px solid #F4F6F5', cursor: r.hasReply ? 'default' : 'pointer' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'#1A2421' }}>
                {LANG_FLAG[r.detectedLang] || '🌐'} {r.reviewer?.displayName || '익명'}
              </div>
              <Badge type={r.hasReply ? 'done' : 'wait'}>{r.hasReply ? '✓ 답변 완료' : '● 답변 대기'}</Badge>
            </div>
            <div style={{ fontSize:12, color:'#EF9F27', marginBottom:3 }}>{'★'.repeat(STAR_MAP[r.starRating] || 5)}</div>
            <div style={{ fontSize:12, color:'#6B7875', lineHeight:1.5, marginBottom:3 }}>{r.comment?.slice(0,80)}{r.comment?.length > 80 ? '...' : ''}</div>
            {!r.hasReply && <div style={{ fontSize:11, color:'#1D9E75', fontWeight:600 }}>탭해서 AI 답변 생성 →</div>}
          </div>
        ))}
      </div>
      <BottomNav />
    </div>
  )
}
