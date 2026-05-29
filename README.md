# 고랑AI 🌿 세팅 가이드

## 배포 전 필요한 것 (총 3가지 설정)

---

## 1️⃣ Supabase 설정 (데이터베이스)

1. supabase.com 접속 → 구글로 가입
2. "New project" → 이름: `gorang-ai` → 비밀번호 설정 → Create
3. 왼쪽 메뉴 **SQL Editor** 클릭
4. `supabase-schema.sql` 파일 내용 전체 복사 → 붙여넣기 → Run
5. 왼쪽 **Settings** → **API** 클릭
6. 아래 값들을 복사해서 Vercel 환경변수에 입력:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role secret` → `SUPABASE_SERVICE_ROLE_KEY`

---

## 2️⃣ Google Cloud Console 설정

### 프로젝트 생성
1. console.cloud.google.com 접속
2. 상단 "프로젝트 선택" → "새 프로젝트" → 이름: `gorang-ai` → 만들기

### API 활성화
왼쪽 메뉴 **API 및 서비스** → **라이브러리** 에서 아래 3개 검색 후 "사용 설정":
- `YouTube Data API v3`
- `Google My Business API`
- `Google+ API` (사용자 정보용)

### OAuth 동의 화면 설정
1. **OAuth 동의 화면** → **외부** 선택 → 만들기
2. 앱 이름: `고랑AI`, 이메일 입력
3. 범위 추가 → 아래 항목 추가:
   - `youtube.upload`
   - `youtube.readonly`
   - `business.manage`
4. 테스트 사용자에 본인 이메일 추가

### OAuth 클라이언트 ID 생성
1. **사용자 인증 정보** → **+ 사용자 인증 정보 만들기** → **OAuth 클라이언트 ID**
2. 애플리케이션 유형: **웹 애플리케이션**
3. 승인된 리디렉션 URI에 추가:
   - `https://your-domain.vercel.app/api/auth/google/callback`
   - (로컬 테스트용) `http://localhost:3000/api/auth/google/callback`
4. 만들기 후 **클라이언트 ID**, **클라이언트 보안 비밀** 복사

→ Vercel 환경변수:
- `GOOGLE_CLIENT_ID` = 클라이언트 ID
- `GOOGLE_CLIENT_SECRET` = 클라이언트 보안 비밀
- `GOOGLE_REDIRECT_URI` = `https://your-domain.vercel.app/api/auth/google/callback`

---

## 3️⃣ Vercel 환경변수 설정

vercel.com → gorang-ai 프로젝트 → Settings → Environment Variables

아래 항목들 입력:

| NAME | VALUE |
|------|-------|
| `ANTHROPIC_API_KEY` | sk-ant-api03-... |
| `GOOGLE_CLIENT_ID` | ...apps.googleusercontent.com |
| `GOOGLE_CLIENT_SECRET` | GOCSPX-... |
| `GOOGLE_REDIRECT_URI` | https://your-domain.vercel.app/api/auth/google/callback |
| `NEXT_PUBLIC_SUPABASE_URL` | https://xxx.supabase.co |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | eyJ... |
| `SUPABASE_SERVICE_ROLE_KEY` | eyJ... |
| `SESSION_SECRET` | 아무 32자 이상 문자열 (예: gorang-ai-secret-key-2024-jeju-v1) |
| `NEXT_PUBLIC_APP_URL` | https://your-domain.vercel.app |

---

## 4️⃣ GitHub 업로드 → Vercel 배포

```bash
# 이 폴더에서 실행
npm install
```

GitHub 레포에 전체 파일 업로드 → Vercel이 자동 배포

---

## 5️⃣ 인스타그램 앱 심사 신청

1. developers.facebook.com 접속 → 앱 만들기
2. 앱 유형: **비즈니스**
3. 제품 추가: **Instagram Graph API**
4. 권한 신청:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_read_engagement`
5. 심사 제출 (1~2주 소요)

## 6️⃣ TikTok 앱 심사 신청

1. developers.tiktok.com 접속 → 앱 만들기
2. 제품 추가: **Content Posting API**
3. 권한 신청: `video.upload`
4. 심사 제출 (1~2주 소요)

---

## 완료 후 테스트 순서

1. gorang-ai.vercel.app 접속
2. 구글로 시작하기 클릭
3. 구글 계정 연동 (유튜브 + 구글 비즈니스)
4. 가게 등록
5. 영상 만들기 → 유튜브 업로드 테스트
6. 리뷰 탭 → 구글 리뷰 확인 + AI 답변 생성

문제 발생 시 Vercel → gorang-ai → Functions 탭에서 에러 로그 확인
