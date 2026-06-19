export const meta = {
  name: 'review-automation',
  description: '구글맵 리뷰 자동화 전체 구현 — 감지→분류→답변생성→카톡알림→원탭게시',
  phases: [
    { title: '설계', detail: 'DB 스키마 + API 구조 설계' },
    { title: '구현', detail: '백엔드 4개 서브에이전트 병렬 개발' },
    { title: '통합', detail: 'UI + 설정화면 + 전체 연결' },
    { title: '검증', detail: '버그스캔 + 보안체크 + 배포체크리스트' },
  ],
}

// ── Phase 1: 설계 ────────────────────────────────────────────────
phase('설계')
log('리뷰 자동화 시스템 설계 시작...')

const design = await agent(`
고랑AI (gorang-ai) 프로젝트의 구글맵 리뷰 자동화 시스템을 설계해줘.

현재 상태:
- Next.js 14 App Router + Supabase + Vercel
- users 테이블에 gbp_account_id, gbp_location_id 있음
- /app/api/ 아래에 라우트 파일들 있음

구현할 기능:
1. GBP API 폴링 — 새 리뷰 주기적 감지 (Vercel Cron, 5분 간격)
2. Claude 분류 — 악성(별점1-2+부정적)/일반/긍정 자동 분류
3. 카카오 알림 — 악성리뷰 발견 시 사장님 폰으로 즉시 알림톡
4. AI 답변 생성 — 한/영/중/일 4개 언어 답변 초안 자동 생성
5. 원탭 게시 — 카톡 버튼 클릭 → 앱에서 바로 GBP에 답변 게시

설계 결과물:
- 필요한 DB 컬럼 목록 (users 테이블 ALTER SQL)
- API 라우트 파일 목록과 각 역할
- 카카오 알림톡 연동 방식 (비즈니스 채널 vs 카카오페이 알림)
- 전체 데이터 흐름도 (텍스트로)

JSON 형식으로만 응답:
{
  "sql": "ALTER TABLE ... SQL문",
  "routes": [{"path": "/app/api/...", "role": "역할 설명"}],
  "kakaoMethod": "연동 방식 설명",
  "dataFlow": "흐름 설명"
}
`, { label: '시스템 설계', schema: {
  type: 'object',
  properties: {
    sql: { type: 'string' },
    routes: { type: 'array', items: { type: 'object', properties: { path: { type: 'string' }, role: { type: 'string' } }, required: ['path', 'role'] } },
    kakaoMethod: { type: 'string' },
    dataFlow: { type: 'string' },
  },
  required: ['sql', 'routes', 'kakaoMethod', 'dataFlow'],
}})

log(`설계 완료 — API 라우트 ${design.routes.length}개 / 카카오: ${design.kakaoMethod.slice(0, 40)}...`)

// ── Phase 2: 구현 (4개 서브에이전트 병렬) ─────────────────────────
phase('구현')
log('4개 서브에이전트 병렬 개발 시작...')

const [gbpPoller, classifier, kakaoNotif, replyGen] = await parallel([

  // 서브A: GBP 폴링 (Vercel Cron)
  () => agent(`
고랑AI 프로젝트 (Next.js 14 App Router, /home/firebat/gorang-ai) 에서
구글맵 새 리뷰 감지 Vercel Cron 구현:

파일 위치: /app/api/cron/review-check/route.js
역할:
- Vercel Cron (5분 간격) 트리거
- GBP API로 최근 리뷰 조회 (google_access_token 사용)
- reviews 테이블의 기존 리뷰와 비교 → 새 리뷰만 추출
- 새 리뷰를 reviews 테이블에 INSERT
- 악성 리뷰(별점 1-2)면 /api/notify/kakao 호출

기존 파일들을 읽고 실제 동작하는 코드를 작성해줘.
Supabase admin 클라이언트는 lib/db.js에서 import.
세션은 사용하지 않고 CRON_SECRET 환경변수로 인증.

완성된 코드 파일 내용만 반환.
`, { label: '서브A: GBP 폴링' }),

  // 서브B: Claude 분류 API
  () => agent(`
고랑AI 프로젝트 (Next.js 14 App Router, /home/firebat/gorang-ai) 에서
리뷰 악성/일반/긍정 분류 API 구현:

파일 위치: /app/api/reviews/classify/route.js
역할:
- POST { reviewId, text, rating, language } 받음
- Claude API (claude-sonnet-4-6) 로 분류
- 분류 결과: { type: 'malicious'|'neutral'|'positive', reason, urgency: 1-5 }
- reviews 테이블의 review_type, urgency 컬럼 업데이트
- 악성이면 recommended_responses 배열도 생성 (한/영/중/일)

반드시 claude-sonnet-4-6 모델 사용 (다른 모델명 금지).
완성된 코드 파일 내용만 반환.
`, { label: '서브B: 리뷰 분류' }),

  // 서브C: 카카오 알림 API
  () => agent(`
고랑AI 프로젝트 (Next.js 14 App Router, /home/firebat/gorang-ai) 에서
카카오톡 악성리뷰 즉시 알림 API 구현:

파일 위치: /app/api/notify/kakao/route.js
역할:
- POST { userId, reviewId, rating, text, urgency } 받음
- 카카오 알림톡 or 카카오 메시지 API로 사장님 폰에 알림 발송
- 알림 내용: 별점 + 리뷰 요약 + AI 추천답변 미리보기
- 알림에 버튼 2개: [원탭 게시] [앱에서 수정 후 게시]
- 딥링크: gorang-ai.com/review?id={reviewId}&action=reply

카카오 연동은 카카오 비즈니스 메시지 API 사용.
환경변수: KAKAO_ACCESS_TOKEN, KAKAO_TEMPLATE_ID
완성된 코드 파일 내용만 반환.
`, { label: '서브C: 카카오 알림' }),

  // 서브D: AI 답변 생성 API
  () => agent(`
고랑AI 프로젝트 (Next.js 14 App Router, /home/firebat/gorang-ai) 에서
리뷰 AI 자동 답변 생성 API 개선:

기존 파일 확인: /app/api/reviews/ 폴더 내 파일들 읽기
역할:
- 리뷰 텍스트 + 별점 + 업종(shop_type) 기반
- 한국어/영어/중국어/일본어 4개 답변 동시 생성
- 악성 리뷰용 답변 톤: 차분하고 전문적으로 대응
- 긍정 리뷰용 답변: 진심 어린 감사 + 재방문 유도
- GBP API로 직접 게시하는 함수도 구현

완성된 코드 파일 내용만 반환.
`, { label: '서브D: 답변 생성' }),
])

log('4개 서브 구현 완료 — 통합 단계로 이동')

// ── Phase 3: 통합 ────────────────────────────────────────────────
phase('통합')

const [ui, settings, vercelConfig] = await parallel([

  // UI: 리뷰 페이지에 알림 배지 + 원탭 게시 버튼 추가
  () => agent(`
고랑AI /app/review/page.js 파일을 읽고,
다음을 추가해줘:
1. 악성 리뷰 카드에 빨간 '⚠️ 긴급' 배지
2. 각 리뷰 카드에 "원탭 게시" 버튼 → /api/reviews/[id]/post-reply 호출
3. AI 추천 답변 3개 미리보기 (클릭하면 편집 가능)
4. 게시 완료 시 초록 체크 애니메이션

기존 코드 스타일 (1D9E75 초록, Noto Sans KR) 유지.
수정된 전체 파일 내용 반환.
`, { label: '서브E: 리뷰 UI' }),

  // 설정 화면: 카카오 알림 ON/OFF
  () => agent(`
고랑AI /app/settings/page.js (또는 설정 관련 파일) 읽고,
카카오 알림 설정 섹션 추가:
- 알림 ON/OFF 토글
- 알림 받을 별점 기준 설정 (1점만 / 1-2점 / 1-3점)
- 카카오 계정 연동 버튼
- 테스트 알림 발송 버튼

기존 UI 스타일 유지. 수정된 파일 내용 반환.
`, { label: '서브F: 설정 UI' }),

  // Vercel cron 설정
  () => agent(`
고랑AI /vercel.json 파일 읽고 (없으면 새로 생성),
Vercel Cron Job 설정 추가:
- /api/cron/review-check → 매 5분 실행
- 환경변수 목록: CRON_SECRET, KAKAO_ACCESS_TOKEN, KAKAO_TEMPLATE_ID

vercel.json 전체 내용 반환.
`, { label: '서브G: Vercel Cron 설정' }),
])

// ── Phase 4: 검증 ────────────────────────────────────────────────
phase('검증')

const review = await agent(`
고랑AI 리뷰 자동화 시스템 전체 코드를 검증해줘.

확인 항목:
1. 보안: CRON_SECRET 없이 호출 가능한 엔드포인트 없는지
2. 에러처리: GBP API 실패 시 폴백 로직 있는지
3. 중복 방지: 같은 리뷰가 2번 INSERT되는 경우 없는지
4. 카카오 알림 실패 시 앱 내 알림으로 폴백하는지
5. 환경변수 목록이 완전한지 (빠진 거 없는지)

문제점과 수정 방법을 구체적으로 알려줘.
`, { label: '검증: 보안·안정성 체크' })

return {
  design,
  implementations: { gbpPoller, classifier, kakaoNotif, replyGen },
  integrations: { ui, settings, vercelConfig },
  review,
  summary: `
✅ 리뷰 자동화 시스템 구현 완료
- GBP 폴링: 5분 간격 자동 감지
- Claude 분류: 악성/일반/긍정 자동 분류
- 카카오 알림: 악성리뷰 즉시 푸시
- AI 답변: 4개 언어 동시 생성
- 원탭 게시: 카톡 버튼 → GBP 직접 게시

다음 단계: Vercel 환경변수 추가 + 카카오 비즈니스 채널 연동
  `,
}
