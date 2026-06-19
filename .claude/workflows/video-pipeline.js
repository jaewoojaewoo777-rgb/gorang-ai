export const meta = {
  name: 'video-pipeline',
  description: '영상 제작 파이프라인 최적화 — 캡션·BGM·플랫폼캡션 병렬화 + 업로드 자동화',
  phases: [
    { title: '분석', detail: '현재 파이프라인 병목 분석' },
    { title: '병렬화', detail: '캡션·BGM·플랫폼캡션 동시 처리' },
    { title: '업로드', detail: '7개 채널 동시 업로드 + 진행률' },
    { title: '검증', detail: '오류처리 강화 + UX 개선' },
  ],
}

// ── Phase 1: 현재 파이프라인 분석 ────────────────────────────────
phase('분석')
log('현재 영상 파이프라인 병목 분석...')

const analysis = await agent(`
고랑AI /app/video/page.js 와 /app/api/video/generate/route.js 파일을 읽고
현재 영상 제작 파이프라인의 병목을 분석해줘.

분석 항목:
1. 순차 처리되는 단계 (병렬화 가능한 것들)
2. 가장 오래 걸리는 단계
3. 불필요한 대기 시간
4. 오류 발생 시 전체가 실패하는 지점

JSON으로 응답:
{
  "bottlenecks": [{"step": "단계명", "issue": "문제", "solution": "해결책"}],
  "parallelizable": ["병렬가능한 단계들"],
  "estimatedSpeedup": "예상 속도 향상"
}
`, { label: '병목 분석', schema: {
  type: 'object',
  properties: {
    bottlenecks: { type: 'array' },
    parallelizable: { type: 'array', items: { type: 'string' } },
    estimatedSpeedup: { type: 'string' },
  },
  required: ['bottlenecks', 'parallelizable', 'estimatedSpeedup'],
}})

log(`분석 완료 — 병렬화 가능: ${analysis.parallelizable.join(', ')}`)
log(`예상 속도 향상: ${analysis.estimatedSpeedup}`)

// ── Phase 2: 핵심 병렬화 구현 ────────────────────────────────────
phase('병렬화')
log('캡션·BGM·플랫폼캡션 병렬 처리 구현...')

const [captionOpt, bgmOpt, platformOpt, progressOpt] = await parallel([

  // 서브A: AI 캡션 + 플랫폼 캡션 동시 생성
  () => agent(`
고랑AI /app/video/page.js 읽고,
현재 순차적인 캡션 생성 흐름을 병렬화해줘:

현재: AI캡션 생성 → 완료 후 → 플랫폼캡션 7개 순차 생성
개선: AI캡션 생성 완료 즉시 → 플랫폼캡션 7개 동시 생성 시작

구체적 수정:
- runAICaption 완료 후 바로 Promise.all로 7개 플랫폼 캡션 동시 생성
- 각 플랫폼 캡션 완료되는 대로 UI에 바로 표시 (전부 완료 기다리지 않음)
- 로딩 상태도 플랫폼별로 독립적으로 표시

수정된 관련 함수 코드 반환.
`, { label: '서브A: 캡션 병렬화' }),

  // 서브B: BGM 선택 최적화
  () => agent(`
고랑AI /app/video/page.js 의 BGM 분석 부분 읽고,
개선해줘:

현재: 영상 만들기 시작 시 BGM 분석 (blocking)
개선:
1. 사진 업로드 직후 바로 BGM 분석 시작 (비동기, 미리 준비)
2. BGM 분석 결과를 캐시해서 재생성 시 재사용
3. BGM 미리듣기 버튼 추가 (30초 미리 들을 수 있게)
4. BGM 변경 시 즉시 반영 (영상 재생성 없이 BGM만 변경 가능하게)

수정된 코드 반환.
`, { label: '서브B: BGM 최적화' }),

  // 서브C: 7개 채널 동시 업로드
  () => agent(`
고랑AI /app/video/page.js 의 handleUpload 함수 읽고,
현재 for 루프로 순차 업로드를 병렬화해줘:

현재: for (const pid of selectedPlatforms) — 순차 업로드
개선:
- Promise.allSettled로 모든 채널 동시 업로드
- 각 채널별 독립적인 진행률 표시 (업로드 중/완료/실패)
- 실패한 채널만 개별 재시도 버튼
- 전체 완료 퍼센트 표시

수정된 handleUpload 함수 반환.
`, { label: '서브C: 동시 업로드' }),

  // 서브D: 실시간 진행률 개선
  () => agent(`
고랑AI /app/video/page.js 의 영상 생성 진행률 부분 읽고,
더 상세하고 실시간으로 개선해줘:

현재: genProgress(숫자%), genMsg(텍스트) — 단순 텍스트
개선:
- 단계별 체크리스트: ✅ 이미지 업로드 → ✅ BGM 선택 → ⏳ 영상 렌더링 (67%)
- 예상 남은 시간 표시 (사진 수 기반 계산)
- 현재 처리 중인 클립 번호 표시 (3/5 클립 완료)
- 완료 시 불꽃 애니메이션

수정된 코드 반환.
`, { label: '서브D: 진행률 UX' }),
])

// ── Phase 3: 업로드 자동화 ────────────────────────────────────────
phase('업로드')
log('자동 업로드 예약 + 채널별 최적화 구현...')

const [autoSchedule, channelOpt] = await parallel([

  // 자동 업로드 예약
  () => agent(`
고랑AI 영상 완성 후 자동 업로드 예약 기능 추가:

파일: /app/video/page.js, /app/api/upload/ 폴더

기능:
- "지금 바로 업로드" vs "최적 시간에 자동 업로드" 선택
- 최적 업로드 시간: 한국 기준 아침 7-9시 / 저녁 7-9시
- 예약 시 Vercel Cron에 등록
- 예약 목록 확인 + 취소 기능

관련 코드와 새 API 라우트 작성해줘.
`, { label: '서브E: 업로드 예약' }),

  // 채널별 최적화
  () => agent(`
고랑AI 채널별 업로드 최적화:

각 플랫폼 특성에 맞게:
- YouTube Shorts: 제목 60자 이하, 태그 15개, #Shorts 해시태그 자동 추가
- TikTok: 캡션 150자 이하, 트렌딩 해시태그 자동 추가
- Instagram 릴스: 캡션 + 해시태그 30개 최적화
- Facebook: 영어 위주 + 지역 태그 (Jeju, Korea)
- LINE: 일본어만 / 간결하게
- 샤오홍수: 중국어 캡션 + 중국 해시태그

/app/video/page.js의 handleUpload 내 플랫폼별 캡션 처리 부분 개선.
`, { label: '서브F: 채널별 최적화' }),
])

// ── Phase 4: 검증 ────────────────────────────────────────────────
phase('검증')

const validation = await agent(`
고랑AI 영상 파이프라인 개선사항 전체 검증:

체크리스트:
1. 병렬 처리 중 하나 실패해도 나머지는 계속 진행하는지
2. 같은 영상이 중복 업로드되는 경우 방지되는지
3. 업로드 실패 시 사용자에게 명확한 오류 메시지 표시하는지
4. 모바일(폰)에서도 정상 동작하는지 (터치 이벤트, 화면 크기)
5. 4K 영상 파일이 각 플랫폼 용량 제한 이내인지
   - YouTube: 256GB
   - TikTok: 287.6MB
   - Instagram: 650MB
   - Facebook: 10GB

문제점과 수정 방법 구체적으로.
`, { label: '검증: 파이프라인 안정성' })

return {
  analysis,
  optimizations: { captionOpt, bgmOpt, platformOpt, progressOpt },
  automations: { autoSchedule, channelOpt },
  validation,
  summary: `
✅ 영상 파이프라인 최적화 완료
- 캡션 생성: 순차 → 7개 동시 (예상 3-5배 빠름)
- 업로드: 순차 → 7개 채널 동시
- BGM: 미리 분석 + 미리듣기
- 진행률: 단계별 체크리스트 + 남은 시간 표시
- 업로드 예약: 최적 시간 자동 업로드
  `,
}
