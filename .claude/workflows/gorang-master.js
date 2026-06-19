export const meta = {
  name: 'gorang-master',
  description: '고랑AI 전체 자동화 — 리뷰·영상·개발 3개 워크플로우 동시 실행',
  phases: [
    { title: '스캔', detail: '프로젝트 현재 상태 전체 파악' },
    { title: '병렬실행', detail: '리뷰자동화 + 영상파이프라인 + 지정기능 동시 개발' },
    { title: '통합검증', detail: '전체 통합 + 충돌 체크 + 배포 준비' },
  ],
}

// args: { feature: "추가할 기능 (없으면 생략)", mode: "all|review|video|dev" }
const mode = args?.mode || 'all'
const featureRequest = args?.feature || null

log(`🚀 고랑AI 마스터 워크플로우 시작 (모드: ${mode})`)

// ── Phase 1: 현재 상태 스캔 ──────────────────────────────────────
phase('스캔')

const projectScan = await agent(`
고랑AI 프로젝트 전체 현재 상태를 스캔해줘:

1. /app/api/ 폴더의 모든 라우트 목록
2. /app/ 폴더의 페이지 목록
3. /lib/ 폴더 내용
4. 현재 구현된 기능 vs 미구현 기능 (CLAUDE.md 기반)
5. 최근 변경된 파일 (git log --oneline -10)

JSON으로 응답:
{
  "implementedFeatures": ["완료된 기능들"],
  "pendingFeatures": ["미완료 기능들"],
  "apiRoutes": ["라우트 목록"],
  "recentChanges": ["최근 변경사항"]
}
`, { label: '프로젝트 전체 스캔', schema: {
  type: 'object',
  properties: {
    implementedFeatures: { type: 'array', items: { type: 'string' } },
    pendingFeatures: { type: 'array', items: { type: 'string' } },
    apiRoutes: { type: 'array', items: { type: 'string' } },
    recentChanges: { type: 'array', items: { type: 'string' } },
  },
  required: ['implementedFeatures', 'pendingFeatures', 'apiRoutes', 'recentChanges'],
}})

log(`현재 구현됨: ${projectScan.implementedFeatures.length}개 / 미완료: ${projectScan.pendingFeatures.length}개`)

// ── Phase 2: 3개 워크플로우 동시 실행 ───────────────────────────
phase('병렬실행')
log('3개 워크플로우 동시 실행...')

const workflowsToRun = []

if (mode === 'all' || mode === 'review') {
  workflowsToRun.push(() => workflow('review-automation').then(r => ({ type: 'review', result: r })))
}
if (mode === 'all' || mode === 'video') {
  workflowsToRun.push(() => workflow('video-pipeline').then(r => ({ type: 'video', result: r })))
}
if ((mode === 'all' || mode === 'dev') && featureRequest) {
  workflowsToRun.push(() => workflow('feature-dev', { feature: featureRequest, priority: 'high' }).then(r => ({ type: 'dev', result: r })))
}

const results = workflowsToRun.length > 0
  ? await parallel(workflowsToRun)
  : []

// ── Phase 3: 통합 검증 ───────────────────────────────────────────
phase('통합검증')
log('전체 통합 + 충돌 체크...')

const finalCheck = await agent(`
고랑AI에서 여러 기능이 동시에 개발됐을 때 통합 검증:

개발된 내용:
${results.map(r => `- ${r?.type}: ${r?.result?.summary || '완료'}`).join('\n')}

체크 항목:
1. 같은 파일을 여러 워크플로우가 수정했는지 (충돌 위험)
2. 환경변수 전체 목록 (Vercel + Railway에 추가해야 할 것들)
3. Supabase SQL 실행 순서 (외래키 의존성 고려)
4. 배포 순서: 어떤 순서로 배포해야 하는지
5. 테스트해야 할 시나리오 목록

명확한 배포 체크리스트로 반환.
`, { label: '통합 검증 + 배포 체크리스트' })

return {
  projectScan,
  results,
  finalCheck,
  summary: `
🎉 고랑AI 마스터 워크플로우 완료!

실행된 워크플로우: ${results.length}개
- ${results.map(r => `✅ ${r?.type} 워크플로우`).join('\n- ')}

미완료 기능 (다음 실행 시):
${projectScan.pendingFeatures.slice(0, 3).join('\n')}

다음 실행 명령어:
  전체: Workflow({name: 'gorang-master', args: {mode: 'all'}})
  리뷰만: Workflow({name: 'gorang-master', args: {mode: 'review'}})
  영상만: Workflow({name: 'gorang-master', args: {mode: 'video'}})
  기능추가: Workflow({name: 'gorang-master', args: {mode: 'dev', feature: '기능설명'}})
  `,
}
