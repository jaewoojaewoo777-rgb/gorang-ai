'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Script from 'next/script'

const PLANS = [
  { key: 'basic', name: '베이직', price: 29000, features: ['리뷰 AI 자동답변 (한·영·중·일)', '영상 제작 월 4편', '유튜브 자동 업로드'] },
  { key: 'standard', name: '스탠다드', price: 59000, popular: true, features: ['베이직 플랜 포함', '영상 제작 월 12편', '3채널 동시 업로드', '악성리뷰 카카오 즉시 알림'] },
  { key: 'pro', name: '프로', price: 129000, features: ['스탠다드 플랜 포함', '4K AI 영상 · 월 8개', '우선 지원'] },
]

const ERROR_MSG = {
  login_first: '먼저 로그인해주세요.',
  invalid_callback: '카드 등록 정보를 확인할 수 없어요. 다시 시도해주세요.',
  invalid_plan: '요금제를 다시 선택해주세요.',
  auth_failed: '카드 등록에 실패했어요. 다시 시도해주세요.',
  charge_failed: '카드는 등록됐지만 첫 결제에 실패했어요. 카드 한도·잔액을 확인 후 다시 시도해주세요.',
}

function BillingContent() {
  const params = useSearchParams()
  const router = useRouter()
  const [sdkReady, setSdkReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [shop, setShop] = useState({})
  const [selected, setSelected] = useState(params.get('plan') || 'standard')
  const error = params.get('error')

  useEffect(() => {
    fetch('/api/shop').then(r => r.ok ? r.json() : null).then(d => {
      if (d) {
        setShop(d)
        if (d.plan && d.plan !== 'none') setSelected(d.plan)
      }
    }).catch(() => {})
  }, [])

  async function startSubscribe() {
    if (!window.TossPayments) return
    setBusy(true)
    const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY
    const tossPayments = window.TossPayments(clientKey)
    const customerKey = shop.id ? `gorang_${shop.id}` : null
    if (!customerKey) {
      alert('로그인 정보를 확인할 수 없어요. 다시 로그인해주세요.')
      setBusy(false)
      return
    }
    const origin = window.location.origin
    tossPayments.requestBillingAuth('카드', {
      customerKey,
      successUrl: `${origin}/api/payment/billing/confirm?plan=${selected}`,
      failUrl: `${origin}/billing?error=auth_failed`,
    }).catch((e) => {
      if (e.code !== 'USER_CANCEL') alert(e.message || '카드 등록 중 오류가 발생했어요.')
      setBusy(false)
    })
  }

  const isActive = shop.plan === selected && shop.subscription_status === 'active'

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#fff' }}>
      <Script src="https://js.tosspayments.com/v1/payment" onLoad={() => setSdkReady(true)} />

      <div style={{ padding: '18px 18px 8px' }}>
        <button onClick={() => router.push('/settings')} style={{ background: 'none', border: 'none', color: '#6B7875', fontSize: 13, cursor: 'pointer', padding: 0 }}>← 설정으로</button>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#1A2421', marginTop: 10 }}>요금제 결제</div>
        <div style={{ fontSize: 12, color: '#B0BAB6', marginTop: 4 }}>토스페이먼츠로 안전하게 매달 자동결제돼요</div>
      </div>

      {error && (
        <div style={{ margin: '4px 18px', padding: '10px 14px', background: '#FDEDED', border: '1.5px solid #F5B5B5', borderRadius: 10, fontSize: 12, color: '#C62828' }}>
          {ERROR_MSG[error] || '오류가 발생했어요. 다시 시도해주세요.'}
        </div>
      )}

      <div style={{ flex: 1, padding: '8px 18px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {PLANS.map(p => (
          <div key={p.key} onClick={() => setSelected(p.key)}
            style={{ cursor: 'pointer', borderRadius: 16, border: `2px solid ${selected === p.key ? '#1D9E75' : '#E6EAE8'}`, padding: '16px 18px', background: selected === p.key ? '#F0FBF6' : '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1A2421' }}>
                {p.name} {p.popular && <span style={{ fontSize: 10, color: '#1D9E75', fontWeight: 700 }}>· 인기</span>}
                {shop.plan === p.key && <span style={{ fontSize: 10, color: '#1D9E75', fontWeight: 700, marginLeft: 6 }}>현재 이용중</span>}
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: selected === p.key ? '#1D9E75' : '#1A2421' }}>
                {p.price.toLocaleString()}<span style={{ fontSize: 11, color: '#B0BAB6', fontWeight: 500 }}>원/월</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {p.features.map(f => (
                <div key={f} style={{ fontSize: 12, color: '#6B7875' }}>✓ {f}</div>
              ))}
            </div>
          </div>
        ))}

        <button onClick={startSubscribe} disabled={busy || !sdkReady || isActive}
          style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', marginTop: 8, background: (busy || !sdkReady || isActive) ? '#B0BAB6' : '#1D9E75', color: '#fff', fontSize: 15, fontWeight: 700, cursor: (busy || !sdkReady || isActive) ? 'not-allowed' : 'pointer' }}>
          {isActive ? '이미 이용중인 플랜이에요' : busy ? '처리 중...' : '카드 등록하고 구독 시작하기'}
        </button>
        <div style={{ fontSize: 11, color: '#B0BAB6', textAlign: 'center' }}>등록한 카드로 매달 자동결제되며, 설정에서 언제든 해지할 수 있어요</div>
      </div>
    </div>
  )
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#B0BAB6' }}>로딩 중...</div>}>
      <BillingContent />
    </Suspense>
  )
}
