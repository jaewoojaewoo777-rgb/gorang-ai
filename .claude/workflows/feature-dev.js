export const meta = {
  name: 'feature-dev',
  description: '새 기능 개발 자동화 — 설계→백엔드→프론트→영상서버→리뷰 병렬 개발',
  whenToUse: '"[기능명] 만들어줘" 처럼 새 기능 추가 요청 시 사용',
  phases: [
    { title: '설계', detail: '기능 분석 + 파일 스캔 + 설계 결정' },
    { title: '개발', detail: 'DB·백엔드·프론트·영상서버 병렬 개발' },
    { title: '통합', detail: '컴포넌트 연결 + 네비게이션 연동' },
    { title: '리뷰', detail: '코드리뷰 + 보안체크 + 배포체크리스트' },
  ],
}

// args: { feature: "구현할 기능 설명", priority: "high|medium|low" }
const featureRequest = args?.feature || '기능 설명이 전달되지 않았습니다'
const priority = args?.priority || 'medium'

log(`🚀 기능 개발 시작: "${featureRequest}" (우선순위: ${priority})`)

// ── Phase 1: 설계 ────────────────────────────────────────────────
phase('설계')

const design = await agent(`
고랑AI 프로젝트 (Next.js 14, /home/firebat/gorang-ai) 에서
다음 기능을 구현하려고 해:

"${featureRequest}"

먼저 프로젝트 파일들을 스캔하고:
1. 관련 기존 파일 목록 (수정이 필요한 파일들)
2. 새로 생성해야 할 파일 목록
3. 필요한 DB 컬럼 변경 (없으면 "없음")
4. 필요한 환경변수 (없으면 "없음")
5. 외부 API 연동 필요 여부
6. 예상 작업 시간 (서브에이전트 병렬 시)

기술 스택: Next.js 14 App Router, Supabase, Claude API(claude-sonnet-4-6), Vercel, Railway

JSON으로 응답:
{
  "filesToModify": ["경로들"],
  "filesToCreate": ["경로들"],
  "dbChanges": "SQL or 없음",
  "envVars": ["변수명들"],
  "externalAPIs": ["API들 or 없음"],
  "estimatedTime": "예상시간",
  "implementationOrder": ["1순위", "2순위", "..."]
}
`, { label: '설계: 기능 분석', schema: {
  type: 'object',
  properties: {
    filesToModify: { type: 'array', items: { type: 'string' } },
    filesToCreate: { type: 'array', items: { type: 'string' } },
    dbChanges: { type: 'string' },
    envVars: { type: 'array', items: { type: 'string' } },
    externalAPIs: { type: 'array', items: { type: 'string' } },
    estimatedTime: { type: 'string' },
    implementationOrder: { type: 'array', items: { type: 'string' } },
  },
  required: ['filesToModify', 'filesToCreate', 'dbChanges', 'envVars', 'externalAPIs', 'estimatedTime', 'implementationOrder'],
}})

log(`설계 완료 — 수정: ${design.filesToModify.length}개 / 생성: ${design.filesToCreate.length}개 파일`)
log(`예상 시간: ${design.estimatedTime}`)

// ── Phase 2: 병렬 개발 ───────────────────────────────────────────
phase('개발')
log('4개 영역 병렬 개발 시작...')

const [backend, frontend, videoServer, tests] = await parallel([

  // 서브A: 백엔드 (API 라우트 + DB)
  () => agent(`
고랑AI 프로젝트에서 다음 기능의 백엔드를 구현해줘:
"${featureRequest}"

설계 정보:
- 수정할 파일: ${design.filesToModify.join(', ')}
- 새로 만들 파일: ${design.filesToCreate.join(', ')}
- DB 변경: ${design.dbChanges}

구현 규칙:
- Supabase admin: import { supabaseAdmin } from '../../../lib/db'
- 세션: import { getSession } from '../../../lib/session'
- Claude API: claude-sonnet-4-6 모델 (필요 시)
- 에러처리: 모든 catch에서 콘솔 로그 + 적절한 HTTP 상태코드
- 인증: 모든 API는 getSession으로 userId 확인

API 라우트 파일들의 완성된 코드 반환.
`, { label: '서브A: 백엔드 개발' }),

  // 서브B: 프론트엔드 (UI 컴포넌트)
  () => agent(`
고랑AI 프로젝트에서 다음 기능의 프론트엔드를 구현해줘:
"${featureRequest}"

UI 규칙:
- 'use client' 사용
- 색상: 메인 #1D9E75 (초록), 배경 #F4F6F5, 텍스트 #1A2421
- 폰트: fontFamily: 'Noto Sans KR, sans-serif'
- 기존 컴포넌트 재사용: import { BottomNav, Card, PrimaryBtn, GhostBtn } from '../../components/ui'
- 모바일 우선 (max-width: 430px 기준)
- 로딩 상태, 에러 상태, 빈 상태 모두 처리

관련 페이지/컴포넌트 파일들의 완성된 코드 반환.
`, { label: '서브B: 프론트엔드 개발' }),

  // 서브C: 영상 서버 (Railway, 해당되는 경우만)
  () => agent(`
고랑AI 영상 서버 (/home/firebat/gorang-video-server/server.js) 에서
다음 기능 관련 변경사항이 있는지 확인하고 구현해줘:
"${featureRequest}"

변경이 필요 없으면 "변경 없음"이라고만 응답.
변경이 필요하면:
- 정확히 어떤 부분을 어떻게 수정하는지
- 수정된 함수/섹션 코드만 반환 (전체 파일 아님)

규칙:
- CRF: 26 유지
- 4K 출력은 finalWidth/finalHeight (2160×3840) 유지
- 클립 처리는 width/height (1080×1920) 유지
`, { label: '서브C: 영상서버 확인' }),

  // 서브D: 타입/상수 + 유틸리티
  () => agent(`
고랑AI 프로젝트에서 다음 기능을 위한 유틸리티/상수 작성:
"${featureRequest}"

필요한 것들:
1. /lib/ 폴더에 추가할 헬퍼 함수들
2. 공통 상수 (API 엔드포인트, 제한값 등)
3. 필요한 환경변수: ${design.envVars.join(', ') || '없음'}

기존 /lib/ 폴더 파일들을 먼저 읽고 충돌 없도록 작성.
`, { label: '서브D: 유틸리티' }),
])

// ── Phase 3: 통합 ────────────────────────────────────────────────
phase('통합')
log('컴포넌트 연결 + 네비게이션 통합...')

const integration = await agent(`
고랑AI에서 방금 구현된 다음 기능을 기존 앱에 통합해줘:
"${featureRequest}"

통합 체크리스트:
1. BottomNav에 새 메뉴 추가 필요 여부 (/components/ui.js 확인)
2. 홈 페이지 (/app/home/page.js) 에서 새 기능으로 연결 링크 추가
3. 설정 페이지에 관련 설정 추가 필요 여부
4. /app/api/shop/route.js 에 새 필드 SELECT 추가 필요 여부

각 파일의 수정이 필요한 부분만 정확히 알려줘 (diff 형식).
`, { label: '통합: 앱 연결' })

// ── Phase 4: 코드 리뷰 ───────────────────────────────────────────
phase('리뷰')

const codeReview = await agent(`
고랑AI에 구현된 다음 기능을 코드 리뷰해줘:
"${featureRequest}"

리뷰 항목:
1. 보안: XSS, SQL 인젝션, 인증 누락 체크
2. 성능: N+1 쿼리, 불필요한 리렌더링
3. 안정성: 에러 핸들링 누락, undefined 접근
4. Supabase RLS: 새 테이블/컬럼에 정책 설정됐는지
5. 환경변수: Vercel에 추가해야 할 변수 목록
6. Railway: 영상 서버 재배포 필요 여부

문제 심각도: 🔴 즉시수정 / 🟡 권장 / 🟢 선택사항
배포 전 체크리스트도 포함.
`, { label: '리뷰: 코드 품질·보안' })

return {
  feature: featureRequest,
  design,
  implementations: { backend, frontend, videoServer, tests },
  integration,
  codeReview,
  summary: `
✅ "${featureRequest}" 구현 완료

파일 변경: ${design.filesToModify.length}개 수정 / ${design.filesToCreate.length}개 생성
DB 변경: ${design.dbChanges !== '없음' ? '있음 (SQL 실행 필요)' : '없음'}
환경변수: ${design.envVars.length > 0 ? design.envVars.join(', ') + ' (Vercel 추가 필요)' : '없음'}

다음 단계: 코드 리뷰 결과의 🔴 항목 먼저 수정 후 git push
  `,
}
