'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const FEATURES = [
  {
    icon: '💬',
    title: '구글맵 리뷰 AI 자동답변',
    desc: '한국어·영어·중국어·일본어 4개 언어로\nAI가 정성스럽게 답변을 달아드려요.\n악성 리뷰는 카카오톡으로 즉시 알림.',
  },
  {
    icon: '🎬',
    title: '사진 → 4K 영상 자동제작',
    desc: '가게 사진 몇 장만 올리면\nBGM·자막·감성 폰트까지 입혀진\n4K 쇼츠 영상이 뚝딱 완성돼요.',
  },
  {
    icon: '📤',
    title: '유튜브·인스타·틱톡 동시 업로드',
    desc: '영상 하나로 3개 채널에 동시 업로드.\n매일 꾸준히 올려 자연 노출을 늘려요.',
  },
]

const STEPS = [
  { num: '01', title: '구글 계정 연동', desc: '버튼 하나로 10초 안에 연동 완료' },
  { num: '02', title: '가게 사진 업로드', desc: '2~5장이면 충분해요' },
  { num: '03', title: 'AI 자동화 가동', desc: '영상 제작 + 리뷰 답변이 자동으로 돌아가요' },
]

const PLANS = [
  {
    name: '베이직',
    price: '29,000',
    features: ['리뷰 AI 자동답변 (한·영·중·일)', '영상 제작 월 4편', '유튜브 자동 업로드'],
  },
  {
    name: '스탠다드',
    price: '59,000',
    popular: true,
    features: ['베이직 플랜 포함', '영상 제작 월 12편', '3채널 동시 업로드', '악성리뷰 카카오 즉시 알림'],
  },
]

export default function LandingPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    fetch('/api/shop')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.shop_name?.trim()) router.replace('/home')
        else if (d?.email) router.replace('/register')
        else setReady(true)
      })
      .catch(() => setReady(true))
  }, [])

  if (!ready) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1D9E75' }}>
        <div style={{ fontSize: 48 }}>🌿</div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', background: '#fff' }}>

      {/* ── 헤더 ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #F0F2F1' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22 }}>🌿</span>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#1A2421', letterSpacing: '-0.5px', fontFamily: 'Noto Sans KR, sans-serif' }}>고랑AI</span>
        </div>
        <a href="/api/auth/google" style={{ textDecoration: 'none' }}>
          <button style={{ padding: '8px 20px', borderRadius: 20, border: '1.5px solid #1D9E75', background: '#fff', color: '#1D9E75', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Noto Sans KR, sans-serif' }}>
            로그인
          </button>
        </a>
      </div>

      {/* ── 히어로 ── */}
      <div style={{ background: 'linear-gradient(155deg, #0A5742 0%, #1D9E75 55%, #4DBFA0 100%)', padding: '48px 24px 56px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.25)', borderRadius: 20, padding: '5px 14px', marginBottom: 22 }}>
          <span style={{ fontSize: 11, color: '#fff', fontWeight: 600, fontFamily: 'Noto Sans KR, sans-serif' }}>🎉 첫 30일 무료 체험 · 신용카드 불필요</span>
        </div>
        <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', lineHeight: 1.35, letterSpacing: '-1px', marginBottom: 14, fontFamily: 'Noto Sans KR, sans-serif' }}>
          제주 사장님을 위한<br />AI 마케팅 파트너
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,.8)', lineHeight: 1.8, marginBottom: 34, fontFamily: 'Noto Sans KR, sans-serif' }}>
          리뷰 관리부터 영상 제작까지<br />하루 5분으로 SNS 노출을 늘려보세요
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <a href="/api/auth/google" style={{ textDecoration: 'none' }}>
            <button style={{ width: '100%', padding: '15px', borderRadius: 14, border: 'none', background: '#fff', color: '#0A5742', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'Noto Sans KR, sans-serif', boxShadow: '0 6px 20px rgba(0,0,0,.18)' }}>
              🔵 구글로 무료 시작하기
            </button>
          </a>
          <button
            onClick={() => router.push('/connect?flow=kakao')}
            style={{ width: '100%', padding: '15px', borderRadius: 14, border: '1.5px solid rgba(255,255,255,.35)', background: 'rgba(255,255,255,.1)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'Noto Sans KR, sans-serif' }}>
            💬 카카오 알림 연동 안내
          </button>
        </div>
      </div>

      {/* ── 핵심 수치 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
        {[
          { num: '4K', label: '영상 화질' },
          { num: '4개국어', label: '자동 답변' },
          { num: '3채널', label: '동시 업로드' },
        ].map((s, i) => (
          <div key={s.num} style={{ textAlign: 'center', padding: '20px 8px', borderRight: i < 2 ? '1px solid #F0F2F1' : 'none', borderBottom: '1px solid #F0F2F1' }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#1D9E75', fontFamily: 'Noto Sans KR, sans-serif' }}>{s.num}</div>
            <div style={{ fontSize: 10, color: '#6B7875', marginTop: 3, fontFamily: 'Noto Sans KR, sans-serif' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── 핵심 기능 ── */}
      <div style={{ padding: '40px 20px 32px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#1D9E75', marginBottom: 8, textAlign: 'center', letterSpacing: '1px', fontFamily: 'Noto Sans KR, sans-serif' }}>핵심 기능</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#1A2421', textAlign: 'center', lineHeight: 1.35, marginBottom: 28, letterSpacing: '-0.5px', fontFamily: 'Noto Sans KR, sans-serif' }}>
          이것 하나로<br />마케팅 끝
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ background: '#F9FAFA', borderRadius: 18, padding: '22px 20px', border: '1.5px solid #F0F2F1' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{f.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#1A2421', marginBottom: 8, fontFamily: 'Noto Sans KR, sans-serif' }}>{f.title}</div>
              <div style={{ fontSize: 13, color: '#6B7875', lineHeight: 1.8, whiteSpace: 'pre-line', fontFamily: 'Noto Sans KR, sans-serif' }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 사용법 ── */}
      <div style={{ background: '#F9FAFA', padding: '40px 20px', borderTop: '1.5px solid #F0F2F1' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#1D9E75', marginBottom: 8, textAlign: 'center', letterSpacing: '1px', fontFamily: 'Noto Sans KR, sans-serif' }}>사용법</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#1A2421', textAlign: 'center', lineHeight: 1.35, marginBottom: 28, letterSpacing: '-0.5px', fontFamily: 'Noto Sans KR, sans-serif' }}>
          딱 3단계로<br />끝납니다
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {STEPS.map(s => (
            <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#fff', borderRadius: 14, padding: '16px 18px', border: '1.5px solid #E6EAE8' }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 900, color: '#fff', fontFamily: 'Noto Sans KR, sans-serif' }}>{s.num}</span>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1A2421', marginBottom: 3, fontFamily: 'Noto Sans KR, sans-serif' }}>{s.title}</div>
                <div style={{ fontSize: 11, color: '#6B7875', fontFamily: 'Noto Sans KR, sans-serif' }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 요금제 ── */}
      <div style={{ padding: '40px 20px', borderTop: '1.5px solid #F0F2F1' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#1D9E75', marginBottom: 8, textAlign: 'center', letterSpacing: '1px', fontFamily: 'Noto Sans KR, sans-serif' }}>요금제</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#1A2421', textAlign: 'center', lineHeight: 1.35, marginBottom: 6, letterSpacing: '-0.5px', fontFamily: 'Noto Sans KR, sans-serif' }}>
          합리적인 가격
        </div>
        <div style={{ fontSize: 12, color: '#6B7875', textAlign: 'center', marginBottom: 28, fontFamily: 'Noto Sans KR, sans-serif' }}>첫 30일은 무료로 직접 경험해보세요</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {PLANS.map(p => (
            <div key={p.name} style={{ borderRadius: 18, border: `1.5px solid ${p.popular ? '#1D9E75' : '#E6EAE8'}`, padding: '22px 20px', position: 'relative', background: p.popular ? '#F0FBF6' : '#fff' }}>
              {p.popular && (
                <div style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', background: '#1D9E75', color: '#fff', fontSize: 10, fontWeight: 700, padding: '4px 14px', borderRadius: 10, whiteSpace: 'nowrap', fontFamily: 'Noto Sans KR, sans-serif' }}>
                  가장 인기 있어요
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#1A2421', fontFamily: 'Noto Sans KR, sans-serif' }}>{p.name}</div>
                <div>
                  <span style={{ fontSize: 22, fontWeight: 900, color: p.popular ? '#1D9E75' : '#1A2421', fontFamily: 'Noto Sans KR, sans-serif' }}>{p.price}원</span>
                  <span style={{ fontSize: 11, color: '#B0BAB6', fontFamily: 'Noto Sans KR, sans-serif' }}>/월</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {p.features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#1A2421', fontFamily: 'Noto Sans KR, sans-serif' }}>
                    <span style={{ color: '#1D9E75', fontWeight: 700, flexShrink: 0 }}>✓</span>
                    {f}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 하단 CTA ── */}
      <div style={{ background: 'linear-gradient(155deg, #0A5742 0%, #1D9E75 100%)', padding: '44px 24px 48px', textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', lineHeight: 1.4, marginBottom: 10, letterSpacing: '-0.5px', fontFamily: 'Noto Sans KR, sans-serif' }}>
          지금 바로 시작해보세요
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,.75)', marginBottom: 28, lineHeight: 1.8, fontFamily: 'Noto Sans KR, sans-serif' }}>
          떡상 약속은 없지만<br />꾸준한 노출로 단골은 만들어드려요
        </div>
        <a href="/api/auth/google" style={{ textDecoration: 'none', display: 'block', marginBottom: 10 }}>
          <button style={{ width: '100%', padding: '16px', borderRadius: 14, border: 'none', background: '#fff', color: '#0A5742', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'Noto Sans KR, sans-serif', boxShadow: '0 6px 20px rgba(0,0,0,.2)' }}>
            🔵 구글로 무료 시작하기
          </button>
        </a>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', fontFamily: 'Noto Sans KR, sans-serif' }}>첫 30일 무료 · 신용카드 불필요</div>
      </div>

    </div>
  )
}
