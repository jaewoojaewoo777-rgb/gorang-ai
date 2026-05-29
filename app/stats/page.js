'use client'
import { useState, useEffect } from 'react'
import { BottomNav, StatCard, Card, AiBox } from '@/components/ui'

export default function StatsPage() {
  const [reviews, setReviews] = useState([])

  useEffect(() => {
    fetch('/api/reviews').then(r => r.json()).then(d => setReviews(d.reviews || [])).catch(() => {})
  }, [])

  const totalReviews = reviews.length
  const replied = reviews.filter(r => r.hasReply).length
  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + ({FIVE:5,FOUR:4,THREE:3,TWO:2,ONE:1}[r.starRating]||5), 0) / reviews.length).toFixed(1)
    : '—'

  const langCount = {}
  reviews.forEach(r => { langCount[r.detectedLang] = (langCount[r.detectedLang] || 0) + 1 })

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
      <div style={{ padding:'18px 18px 12px' }}>
        <div style={{ fontSize:18, fontWeight:700, color:'#1A2421' }}>📊 성과 리포트</div>
        <div style={{ fontSize:11, color:'#B0BAB6', marginTop:2 }}>구글 비즈니스 기준</div>
      </div>
      <div style={{ flex:1, padding:'4px 18px 16px', overflowY:'auto' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
          <StatCard value={totalReviews} label="총 리뷰 수" />
          <StatCard value={replied} label="답변 완료" green />
          <StatCard value={totalReviews - replied} label="답변 대기" />
          <StatCard value={avgRating + '⭐'} label="평균 별점" green />
        </div>

        {Object.keys(langCount).length > 0 && (
          <Card style={{ marginBottom:12 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#1A2421', marginBottom:10 }}>리뷰 언어 분포</div>
            {Object.entries(langCount).map(([lang, count]) => (
              <div key={lang} style={{ marginBottom:8 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:3 }}>
                  <span>{{ en:'🇺🇸 영어', zh:'🇨🇳 중국어', ko:'🇰🇷 한국어', ja:'🇯🇵 일본어' }[lang] || lang}</span>
                  <span style={{ color:'#1D9E75', fontWeight:600 }}>{count}건</span>
                </div>
                <div style={{ height:6, background:'#F4F6F5', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:6, borderRadius:3, background:'#1D9E75', width:`${Math.round((count/totalReviews)*100)}%` }} />
                </div>
              </div>
            ))}
          </Card>
        )}

        <AiBox label="✦ AI 인사이트">
          {totalReviews === 0
            ? '구글 비즈니스 계정을 연동하면\n리뷰 분석 인사이트가 여기 나타나요.'
            : `총 ${totalReviews}개 리뷰 중 ${replied}개에 답변했어요.\n${totalReviews - replied > 0 ? `아직 ${totalReviews - replied}개 리뷰가 답변을 기다리고 있어요. 리뷰 탭에서 확인해 보세요! 🎯` : '모든 리뷰에 답변 완료! 훌륭해요 🎉'}`}
        </AiBox>
      </div>
      <BottomNav />
    </div>
  )
}
