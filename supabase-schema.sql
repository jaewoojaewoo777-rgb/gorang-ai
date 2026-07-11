-- ======================================
-- 고랑AI Supabase 테이블 설정
-- supabase.com > SQL Editor 에 붙여넣고 실행
-- ======================================

-- 1. 사용자 테이블
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  google_id TEXT UNIQUE NOT NULL,
  email TEXT,
  google_name TEXT,
  shop_name TEXT,
  shop_type TEXT DEFAULT 'pension',
  shop_location TEXT,
  shop_intro TEXT,
  google_access_token TEXT,
  google_refresh_token TEXT,
  google_token_expiry TIMESTAMPTZ,
  gbp_account_id TEXT,
  gbp_location_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 리뷰 테이블
CREATE TABLE reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  review_id TEXT NOT NULL,
  reviewer_name TEXT,
  rating INTEGER DEFAULT 5,
  review_text TEXT,
  language TEXT DEFAULT 'ko',
  reply_text TEXT,
  has_reply BOOLEAN DEFAULT false,
  replied_at TIMESTAMPTZ,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, review_id)
);

-- 3. 영상 업로드 기록 테이블
CREATE TABLE video_uploads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  caption_en TEXT,
  caption_zh TEXT,
  caption_ja TEXT,
  caption_ko TEXT,
  platforms TEXT[],
  status TEXT DEFAULT 'done',
  youtube_video_id TEXT,
  instagram_media_id TEXT,
  tiktok_video_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 영상 저장(즐겨찾기) 트래킹 ─────────────────────────────────
-- Supabase SQL Editor에서 실행하세요
-- CREATE TABLE IF NOT EXISTS video_saves (
--   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
--   user_id UUID REFERENCES users(id) ON DELETE CASCADE,
--   video_url TEXT,
--   video_type TEXT,
--   title TEXT,
--   created_at TIMESTAMPTZ DEFAULT now()
-- );
-- ALTER TABLE video_saves ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "service_role_saves" ON video_saves FOR ALL USING (true);

-- ── TripAdvisor 컬럼 추가 ───────────────────────────────────
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS tripadvisor_location_id TEXT;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS tripadvisor_location_name TEXT;
-- reviews 테이블에 출처(source) 컬럼 추가 (리뷰 ID는 ta_ 접두사로 구분)
-- ALTER TABLE reviews ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'google';

-- ── Meta (Instagram + Facebook) 컬럼 추가 ────────────────────
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS meta_access_token TEXT;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS meta_token_expiry TIMESTAMPTZ;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS instagram_user_id TEXT;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS fb_page_id TEXT;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS fb_page_name TEXT;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS fb_page_access_token TEXT;

-- ── LINE Official Account 컬럼 추가 ──────────────────────────
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS line_channel_access_token TEXT;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS line_bot_name TEXT;

-- ── 토스페이먼츠 정기결제(빌링) 컬럼 + 결제이력 테이블 ──────────
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'none';
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive';
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS toss_customer_key TEXT;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS toss_billing_key TEXT;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS card_company TEXT;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS card_last4 TEXT;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS next_billing_at TIMESTAMPTZ;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false;
--
-- CREATE TABLE IF NOT EXISTS payments (
--   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
--   user_id UUID REFERENCES users(id) ON DELETE CASCADE,
--   order_id TEXT UNIQUE NOT NULL,
--   plan TEXT NOT NULL,
--   amount INTEGER NOT NULL,
--   status TEXT NOT NULL, -- paid | failed
--   toss_payment_key TEXT,
--   failure_reason TEXT,
--   raw JSONB,
--   created_at TIMESTAMPTZ DEFAULT now()
-- );
-- ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "service_role_payments" ON payments FOR ALL USING (true);

-- ── 네이버 플레이스 연동 (2026-07-11, 공식 API 미제공 → 세션쿠키 방식) ──
-- ⚠️ 참고: reviews 테이블은 이 파일의 CREATE TABLE 정의(rating/review_text/has_reply/raw_data)와
-- 실제 운영 DB(star_rating/comment/review_type/... , app/api/reviews/poll 등에서 사용)가 어긋나 있음.
-- 이 파일이 오래돼서 실제 컬럼을 못 따라간 상태로 보임 — 네이버는 실제 운영 스키마(TripAdvisor 패턴,
-- review_id에 'nv_' 접두사) 기준으로 맞춤. source 컬럼은 코드 어디서도 안 쓰여서 별도 추가 안 함.
-- 연동코드(페어링) 발급용 컬럼
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS naver_pairing_code TEXT;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS naver_pairing_code_expires_at TIMESTAMPTZ;
-- CREATE TABLE IF NOT EXISTS naver_connections (
--   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
--   user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
--   place_id TEXT,
--   booking_business_id TEXT, -- placeId와 별개 값. 스마트플레이스 리뷰 URL에 둘 다 필요 (확장이 탭 URL에서 파싱)
--   place_name TEXT,
--   place_url TEXT,
--   encrypted_session TEXT NOT NULL,  -- AES-256-GCM 암호화된 세션쿠키 JSON (lib/crypto.js)
--   session_iv TEXT NOT NULL,
--   session_auth_tag TEXT NOT NULL,
--   session_captured_at TIMESTAMPTZ DEFAULT now(),
--   session_status TEXT DEFAULT 'active', -- active | expired | revoked
--   last_polled_at TIMESTAMPTZ,
--   created_at TIMESTAMPTZ DEFAULT now(),
--   updated_at TIMESTAMPTZ DEFAULT now()
-- );
-- ALTER TABLE naver_connections ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "service_role_naver_connections" ON naver_connections FOR ALL USING (true);

-- 4. Row Level Security 설정 (보안)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_uploads ENABLE ROW LEVEL SECURITY;

-- service role 키는 모든 테이블 접근 가능 (백엔드에서 사용)
CREATE POLICY "service_role_users" ON users FOR ALL USING (true);
CREATE POLICY "service_role_reviews" ON reviews FOR ALL USING (true);
CREATE POLICY "service_role_uploads" ON video_uploads FOR ALL USING (true);
