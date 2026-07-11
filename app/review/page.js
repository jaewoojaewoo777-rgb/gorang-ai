'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BottomNav, Badge, AiBox, LoadingDots, PrimaryBtn, GhostBtn } from '../../components/ui'

const LANG_FLAG = { en:'🇺🇸', zh:'🇨🇳', ko:'🇰🇷', ja:'🇯🇵' }
const LANG_NAME = { en:'영어', zh:'중국어', ko:'한국어', ja:'일본어' }

// DB(reviews 테이블, snake_case) 행을 화면에서 쓰는 형태로 통일.
// GBP/네이버 모두 poll 라우트에서 이 스키마(star_rating/comment/reply_status 등)로 저장됨.
function normalizeReview(r) {
  return {
    reviewId: r.review_id,
    comment: r.comment,
    starRating: typeof r.star_rating === 'number' ? r.star_rating : 5,
    reviewer: { displayName: r.reviewer_name || '익명' },
    detectedLang: r.language || 'ko',
    hasReply: r.reply_status === 'replied',
    koreanSummary: r.korean_summary,
    suggestedReplies: r.suggested_replies,
  }
}

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
  const [polling, setPolling] = useState(false)
  const [pollResult, setPollResult] = useState(null)
  const [naverPolling, setNaverPolling] = useState(false)
  const [naverPollResult, setNaverPollResult] = useState(null)
  const [naverPairing, setNaverPairing] = useState(null)
  const [naverPairingLoading, setNaverPairingLoading] = useState(false)

  const refreshReviews = async () => {
    const d = await fetch('/api/reviews/poll').then(r => r.json())
    setReviews((d.reviews || []).map(normalizeReview))
  }

  useEffect(() => {
    refreshReviews().finally(() => setLoading(false))
  }, [])

  const handlePoll = async () => {
    setPolling(true)
    setPollResult(null)
    try {
      const res = await fetch('/api/reviews/poll', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setPollResult(data.newReviews > 0 ? `✅ 새 리뷰 ${data.newReviews}개 감지 → 카톡 발송` : '✅ 새 리뷰 없음')
        if (data.newReviews > 0) await refreshReviews()
      } else {
        setPollResult('❌ ' + (data.error || '오류'))
      }
    } catch (e) {
      setPollResult('❌ 네트워크 오류')
    }
    setPolling(false)
  }

  const handleGetNaverCode = async () => {
    setNaverPairingLoading(true)
    try {
      const res = await fetch('/api/naver/pairing-code', { method: 'POST' })
      const data = await res.json()
      if (data.code) setNaverPairing(data)
      else alert('연동코드 발급 실패: ' + (data.error || '오류'))
    } catch {
      alert('네트워크 오류')
    }
    setNaverPairingLoading(false)
  }

  const handleNaverPoll = async () => {
    setNaverPolling(true)
    setNaverPollResult(null)
    try {
      const res = await fetch('/api/naver/poll', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        const more = data.hasMore ? ' (더 있어요, "네이버 새 리뷰 확인" 한 번 더 눌러주세요)' : ''
        setNaverPollResult(data.newReviews > 0 ? `✅ 새 리뷰 ${data.newReviews}개 감지 → 카톡 발송${more}` : '✅ 새 리뷰 없음')
        if (data.newReviews > 0) await refreshReviews()
      } else {
        setNaverPollResult('❌ ' + (data.error || '오류'))
      }
    } catch {
      setNaverPollResult('❌ 네트워크 오류')
    }
    setNaverPolling(false)
  }

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
    // 네이버 리뷰(review_id에 nv_ 접두사)는 전용 라우트로, 그 외(구글)는 기존 라우트로
    const endpoint = selected.reviewId?.startsWith('nv_') ? '/api/naver/reply' : '/api/reviews'
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewId: selected.reviewId, replyText: reply }),
    })
    const data = await res.json()
    setPublishing(false)
    if (data.ok) {
      setReviews(prev => prev.map(r => r.reviewId === selected.reviewId ? { ...r, hasReply: true } : r))
      setSelected(null)
      alert('✅ 답변이 게시됐어요!')
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
            <span style={{ fontSize:12, color:'#EF9F27' }}>{'★'.repeat(selected.starRating || 5)}</span>
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
          {publishing ? '게시 중...' : '답변 게시'}
        </PrimaryBtn>
        <div style={{ fontSize:11, color:'#B0BAB6', textAlign:'center', marginTop:6 }}>
          {selected.reviewId?.startsWith('nv_') ? '답변이 네이버 플레이스에 바로 등록돼요' : '답변이 구글맵스에 바로 등록돼요'}
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
      <div style={{ padding:'18px 18px 10px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <div style={{ fontSize:18, fontWeight:700, color:'#1A2421' }}>리뷰 관리</div>
          <button onClick={handlePoll} disabled={polling}
            style={{ padding:'6px 14px', borderRadius:20, border:'1.5px solid #1D9E75', background: polling?'#E1F5EE':'#1D9E75', color: polling?'#0F6E56':'#fff', fontSize:12, fontWeight:600, cursor: polling?'not-allowed':'pointer', fontFamily:'Noto Sans KR, sans-serif' }}>
            {polling ? '확인 중...' : '🔔 구글 새 리뷰 확인'}
          </button>
        </div>
        {pollResult && <div style={{ fontSize:12, color: pollResult.startsWith('✅')?'#0F6E56':'#E53E3E', background: pollResult.startsWith('✅')?'#E1F5EE':'#FFF5F5', padding:'6px 12px', borderRadius:8, marginBottom:4 }}>{pollResult}</div>}
        <div style={{ display:'flex', gap:6, marginBottom:6 }}>
          <button onClick={handleGetNaverCode} disabled={naverPairingLoading}
            style={{ padding:'6px 14px', borderRadius:20, border:'1.5px solid #03C75A', background: naverPairingLoading?'#E8F9EE':'#03C75A', color: naverPairingLoading?'#0B8A3E':'#fff', fontSize:12, fontWeight:600, cursor: naverPairingLoading?'not-allowed':'pointer', fontFamily:'Noto Sans KR, sans-serif' }}>
            {naverPairingLoading ? '발급 중...' : '📗 네이버 연동하기'}
          </button>
          <button onClick={handleNaverPoll} disabled={naverPolling}
            style={{ padding:'6px 14px', borderRadius:20, border:'1.5px solid #03C75A', background: naverPolling?'#E8F9EE':'#fff', color:'#0B8A3E', fontSize:12, fontWeight:600, cursor: naverPolling?'not-allowed':'pointer', fontFamily:'Noto Sans KR, sans-serif' }}>
            {naverPolling ? '확인 중...' : '📗 네이버 새 리뷰 확인'}
          </button>
        </div>
        {naverPairing && (
          <div style={{ fontSize:12, color:'#1A2421', background:'#E8F9EE', border:'1.5px solid #03C75A', borderRadius:10, padding:'10px 12px', marginBottom:6, lineHeight:1.7 }}>
            <b>연동코드: {naverPairing.code}</b> (5분 내 사용)<br/>
            1) 크롬에 &apos;고랑AI 네이버 연동&apos; 확장 설치 → 2) 네이버 로그인 → 3) 확장 아이콘 클릭 후 위 코드 입력
          </div>
        )}
        {naverPollResult && <div style={{ fontSize:12, color: naverPollResult.startsWith('✅')?'#0F6E56':'#E53E3E', background: naverPollResult.startsWith('✅')?'#E1F5EE':'#FFF5F5', padding:'6px 12px', borderRadius:8, marginBottom:4 }}>{naverPollResult}</div>}
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
            {reviews.length === 0 ? '위 버튼으로 새 리뷰를 확인하면\n여기에 나타나요' : '해당하는 리뷰가 없어요'}
          </div>
        )}
        {filtered.map(r => (
          <div key={r.reviewId} onClick={() => !r.hasReply && openReview(r)}
            style={{ padding:'10px 0', borderBottom:'1.5px solid #F4F6F5', cursor: r.hasReply ? 'default' : 'pointer' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'#1A2421' }}>
                {r.reviewId?.startsWith('nv_') ? '📗' : (LANG_FLAG[r.detectedLang] || '🌐')} {r.reviewer?.displayName || '익명'}
              </div>
              <Badge type={r.hasReply ? 'done' : 'wait'}>{r.hasReply ? '✓ 답변 완료' : '● 답변 대기'}</Badge>
            </div>
            <div style={{ fontSize:12, color:'#EF9F27', marginBottom:3 }}>{'★'.repeat(r.starRating || 5)}</div>
            <div style={{ fontSize:12, color:'#6B7875', lineHeight:1.5, marginBottom:3 }}>{r.comment?.slice(0,80)}{r.comment?.length > 80 ? '...' : ''}</div>
            {!r.hasReply && <div style={{ fontSize:11, color:'#1D9E75', fontWeight:600 }}>탭해서 AI 답변 생성 →</div>}
          </div>
        ))}
      </div>
      <BottomNav />
    </div>
  )
}
