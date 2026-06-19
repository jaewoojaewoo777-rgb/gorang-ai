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
    tiktok_cancelled: '틱톡 연동이 취소됐어요.',
    tiktok_state:     '틱톡 연동 보안 검증에 실패했어요. 다시 시도해주세요.',
  }

  // 채널별 연동 안내 가이드 (틱톡 · 트립어드바이저 · 레드노트)
  const GUIDES = {
    tiktok: {
      emoji: '🎵',
      title: '틱톡 연동',
      subtitle: '제작한 영상을 틱톡에 자동 업로드하세요',
      infoTitle: '🎵 틱톡 연동 시 가능한 기능',
      infoItems: [
        '✅ 제작한 쇼츠 영상 틱톡 자동 업로드',
        '✅ 캡션·해시태그 자동 입력',
      ],
      steps: [
        { num: 1, title: '아래 버튼으로 틱톡 로그인', desc: '틱톡 계정으로 로그인하면 자동으로 연동돼요.' },
        { num: 2, title: '영상 업로드 권한 허용', desc: '틱톡 화면에서 권한을 허용해주세요.' },
        { num: 3, title: '연동 완료', desc: '이제 영상 제작 후 틱톡에 바로 올릴 수 있어요.' },
      ],
      connect: { label: '🎵 틱톡 계정으로 연동하기', href: '/api/auth/tiktok' },
    },
    tripadvisor: {
      emoji: '🌍',
      title: '트립어드바이저 연동',
      subtitle: '트립어드바이저 리뷰를 관리하세요',
      infoTitle: 'ℹ️ 트립어드바이저 안내',
      infoItems: [
        '트립어드바이저는 공식 API가 제한적이에요.',
        '비즈니스 관리 센터에서 직접 관리하거나,',
        '고랑AI 팀이 리뷰 답변을 도와드려요.',
      ],
      steps: [
        { num: 1, title: '비즈니스 관리 센터 접속', desc: '아래 버튼으로 트립어드바이저 오너 센터에 들어가세요.' },
        { num: 2, title: '내 가게 페이지 확인/등록', desc: '아직 등록 전이면 가게를 먼저 등록해주세요.' },
        { num: 3, title: '리뷰 답변 대행', desc: '외국어 리뷰 답변은 고랑AI 팀에 맡기실 수 있어요.' },
      ],
      link: { label: '트립어드바이저 비즈니스 관리 →', url: 'https://www.tripadvisor.com/Owners' },
    },
    rednote: {
      emoji: '🇨🇳',
      title: '레드노트(샤오홍슈) 연동',
      subtitle: '중국 고객에게 가게를 노출하세요',
      infoTitle: 'ℹ️ 레드노트 안내',
      infoItems: [
        '레드노트(샤오홍슈)는 공식 업로드 API가 없어요.',
        '고랑AI에서 영상을 만든 뒤 반자동으로 올려요.',
      ],
      steps: [
        { num: 1, title: '고랑AI에서 영상 제작', desc: '제주 감성 영상을 만들어요.' },
        { num: 2, title: '영상 다운로드', desc: '완성된 영상을 휴대폰에 저장하세요.' },
        { num: 3, title: '샤오홍슈 앱에 업로드', desc: '직접 올리거나 고랑AI 팀이 대행해드려요.' },
      ],
      link: { label: '샤오홍슈(레드노트) 바로가기 →', url: 'https://www.xiaohongshu.com' },
    },
  }

  if (GUIDES[flow]) {
    const g = GUIDES[flow]
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '40px 24px', gap: 16 }}>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>{g.emoji}</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#1A2421', marginBottom: 6 }}>{g.title}</div>
          <div style={{ fontSize: 13, color: '#6B7875', lineHeight: 1.6 }}>{g.subtitle}</div>
        </div>

        {error && (
          <div style={{ background: '#FCEBEB', border: '1.5px solid #F09595', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#A32D2D' }}>
            {errorMsg[error] || '오류가 발생했어요. 다시 시도해주세요.'}
          </div>
        )}

        <div style={{ background: '#E1F5EE', border: '1.5px solid #5DCAA5', borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0F6E56', marginBottom: 10 }}>{g.infoTitle}</div>
          {g.infoItems.map(t => (
            <div key={t} style={{ fontSize: 13, color: '#085041', marginBottom: 6, lineHeight: 1.5 }}>{t}</div>
          ))}
        </div>

        {g.steps.map(step => (
          <div key={step.num} style={{ background: '#F9FAFA', border: '1.5px solid #E6EAE8', borderRadius: 14, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#E6EAE8', color: '#6B7875', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{step.num}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1A2421' }}>{step.title}</div>
            </div>
            <div style={{ fontSize: 12, color: '#6B7875', lineHeight: 1.7, paddingLeft: 38 }}>{step.desc}</div>
          </div>
        ))}

        {g.connect && (
          <a href={g.connect.href} style={{ textDecoration: 'none' }}>
            <button style={{ width: '100%', padding: 16, borderRadius: 14, border: 'none', background: '#1D9E75', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'Noto Sans KR, sans-serif' }}>
              {g.connect.label}
            </button>
          </a>
        )}

        {g.link && (
          <a href={g.link.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
            <button style={{ width: '100%', padding: 16, borderRadius: 14, border: '1.5px solid #1D9E75', background: '#fff', color: '#1D9E75', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'Noto Sans KR, sans-serif' }}>
              {g.link.label}
            </button>
          </a>
        )}

        <div style={{ background: '#FFF8E6', border: '1.5px solid #F5C842', borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#7A4A00', marginBottom: 6 }}>💡 도움이 필요하세요?</div>
          <div style={{ fontSize: 12, color: '#5C3500', lineHeight: 1.7 }}>
            연동에 어려움이 있으면 고랑AI 팀에 문의해주세요. 직접 도와드릴게요.
          </div>
        </div>

        <button
          onClick={() => router.push('/home')}
          style={{ width: '100%', padding: 12, borderRadius: 12, border: '1.5px solid #E6EAE8', background: '#fff', color: '#6B7875', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Noto Sans KR, sans-serif' }}
        >
          ← 홈으로
        </button>
      </div>
    )
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
