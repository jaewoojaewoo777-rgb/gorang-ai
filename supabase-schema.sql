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

-- 4. Row Level Security 설정 (보안)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_uploads ENABLE ROW LEVEL SECURITY;

-- service role 키는 모든 테이블 접근 가능 (백엔드에서 사용)
CREATE POLICY "service_role_users" ON users FOR ALL USING (true);
CREATE POLICY "service_role_reviews" ON reviews FOR ALL USING (true);
CREATE POLICY "service_role_uploads" ON video_uploads FOR ALL USING (true);
