'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

function ConnectContent() {
  const params = useSearchParams()
  const router = useRouter()
  const error = params.get('error')
  const flow = params.get('flow') // 'kakao' = 카카오 연동 안내 흐름

  const [googleConnected, setGoogleConnected] = useState(false)
  const [kakaoStep, setKakaoStep] = useState(1)

  useEffect(() => {
    fetch('/api/shop').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.google_connected) setGoogleConnected(true)
    }).catch(() => {})
  }, [])

  const errorMsg = {
    login_first:      '먼저 구글 계정으로 로그인한 뒤 시도해주세요.',
    cancelled:        '연동이 취소됐어요.',
    failed:           '연동 중 오류가 발생했어요. 다시 시도해주세요.',
  }

  // 카카오 연동 안내 흐름
  if (flow === 'kakao') {
    const steps = [
      {
        num: 1,
        title: '구글 계정으로 로그인',
        desc: '고랑AI는 구글 계정으로 로그인해요.\n유튜브·구글맵 리뷰 기능을 함께 사용할 수 있어요.',
        action: googleConnected ? null : (
          <a href="/api/auth/google" style={{ textDecoration: 'none' }}>
            <button style={{ width: '100%', marginTop: 12, padding: '12px', borderRadius: 12, border: 'none', background: '#1D9E75', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Noto Sans KR, sans-serif' }}>
              🔵 구글 계정으로 로그인하기
            </button>
          </a>
        ),
        done: googleConnected,
      },
      {
        num: 2,
        title: '카카오 비즈니스 채널 개설',
        desc: '카카오 비즈니스(business.kakao.com)에서\n채널을 개설하고 "알림톡 채널"로 신청하세요.',
        link: { label: '카카오 비즈니스 바로가기 →', url: 'https://business.kakao.com' },
        done: false,
      },
      {
        num: 3,
        title: '알림톡 템플릿 등록',
        desc: '채널 관리자 센터 → 알림톡 → 템플릿 등록\n고랑AI 팀이 템플릿 승인을 도와드려요.',
        done: false,
      },
      {
        num: 4,
        title: '채널 연동 완료',
        desc: '채널 연동이 완료되면 악성 리뷰 즉시 알림·\n외국어 리뷰 번역 답변을 카카오톡으로 받을 수 있어요.',
        done: false,
      },
    ]

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '40px 24px', gap: 16 }}>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>💬</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#1A2421', marginBottom: 6 }}>카카오 알림 연동</div>
          <div style={{ fontSize: 13, color: '#6B7875', lineHeight: 1.6 }}>악성 리뷰를 카카오톡으로 즉시 받아보세요</div>
        </div>

        {steps.map((step) => (
          <div key={step.num} style={{ background: step.done ? '#E1F5EE' : '#F9FAFA', border: `1.5px solid ${step.done ? '#5DCAA5' : '#E6EAE8'}`, borderRadius: 14, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: step.done ? '#1D9E75' : '#E6EAE8', color: step.done ? '#fff' : '#B0BAB6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                {step.done ? '✓' : step.num}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: step.done ? '#0F6E56' : '#1A2421' }}>{step.title}</div>
            </div>
            <div style={{ fontSize: 12, color: '#6B7875', lineHeight: 1.7, whiteSpace: 'pre-line', paddingLeft: 38 }}>
              {step.desc}
            </div>
            {step.link && (
              <a href={step.link.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', paddingLeft: 38, marginTop: 8, fontSize: 12, color: '#1D9E75', fontWeight: 600 }}>
                {step.link.label}
              </a>
            )}
            {step.action && <div style={{ paddingLeft: 0 }}>{step.action}</div>}
          </div>
        ))}

        <div style={{ background: '#FFF8E6', border: '1.5px solid #F5C842', borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#7A4A00', marginBottom: 6 }}>💡 도움이 필요하세요?</div>
          <div style={{ fontSize: 12, color: '#5C3500', lineHeight: 1.7 }}>
            카카오 채널 개설·알림톡 템플릿 등록에 어려움이 있으면<br />
            고랑AI 팀에 문의해주세요. 직접 도와드릴게요.
          </div>
        </div>

        <button
          onClick={() => router.push('/')}
          style={{ width: '100%', padding: 12, borderRadius: 12, border: '1.5px solid #E6EAE8', background: '#fff', color: '#6B7875', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Noto Sans KR, sans-serif' }}
        >
          ← 처음으로
        </button>
      </div>
    )
  }

  // 기본 구글 연동 화면
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '40px 24px', gap: 16 }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🔗</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#1A2421', marginBottom: 6 }}>구글 계정 연동</div>
        <div style={{ fontSize: 13, color: '#6B7875', lineHeight: 1.6 }}>구글 계정 하나로 유튜브·구글맵 기능을 모두 사용하세요</div>
      </div>

      {error && (
        <div style={{ background: '#FCEBEB', border: '1.5px solid #F09595', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#A32D2D' }}>
          {errorMsg[error] || '오류가 발생했어요. 다시 시도해주세요.'}
        </div>
      )}

      <div style={{ background: '#E1F5EE', border: '1.5px solid #5DCAA5', borderRadius: 14, padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#0F6E56', marginBottom: 10 }}>🔵 구글 연동으로 사용 가능한 기능</div>
        {[
          '✅ 유튜브 쇼츠 · 일반 자동 업로드',
          '✅ 구글맵스 리뷰 AI 자동 답변 (한·영·중·일)',
          '✅ 악성 리뷰 즉시 감지 및 카카오톡 알림',
        ].map(t => (
          <div key={t} style={{ fontSize: 13, color: '#085041', marginBottom: 6, lineHeight: 1.5 }}>{t}</div>
        ))}
        {googleConnected && (
          <div style={{ marginTop: 10, padding: '8px 12px', background: '#C8EFE3', borderRadius: 8, fontSize: 12, color: '#0F6E56', fontWeight: 700 }}>
            ✅ 구글 연동 완료 — 모든 기능 사용 가능해요!
          </div>
        )}
      </div>

      {googleConnected ? (
        <button
          onClick={() => router.push('/home')}
          style={{ width: '100%', padding: 16, borderRadius: 14, border: 'none', background: '#1D9E75', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'Noto Sans KR, sans-serif' }}
        >
          ✅ 연동완료 — 홈으로 가기 →
        </button>
      ) : (
        <a href="/api/auth/google" style={{ textDecoration: 'none' }}>
          <button style={{ width: '100%', padding: 16, borderRadius: 14, border: 'none', background: '#1D9E75', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'Noto Sans KR, sans-serif' }}>
            🔵 구글 계정으로 연동하기
          </button>
        </a>
      )}

      <div style={{ fontSize: 11, color: '#B0BAB6', textAlign: 'center', marginTop: 4, lineHeight: 1.7 }}>
        구글 계정 연동 시 유튜브 업로드 및 구글맵 리뷰 관리 권한이 요청됩니다.
      </div>
    </div>
  )
}

export default function ConnectPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#B0BAB6' }}>로딩 중...</div>}>
      <ConnectContent />
    </Suspense>
  )
}
