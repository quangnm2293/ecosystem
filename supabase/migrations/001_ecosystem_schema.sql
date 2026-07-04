-- Ecosystem Platform — Supabase PostgreSQL schema (single source of truth)
-- Run in Supabase SQL Editor or: supabase db push

CREATE EXTENSION IF NOT EXISTS vector;

-- ─── Enums ───────────────────────────────────────────────────────────────────
CREATE TYPE content_type AS ENUM ('BLOG','AI_TOOL','DEV_TOOL','GAME','COMPARE');
CREATE TYPE content_status AS ENUM ('DRAFT','PUBLISHED','ARCHIVED');
CREATE TYPE render_strategy AS ENUM ('SSG','ISR','SSR');
CREATE TYPE link_relation AS ENUM ('RELATED','SEE_ALSO','COMPARE_TO','TOOL_FOR');
CREATE TYPE index_status AS ENUM ('PENDING','INDEXED','NOINDEX','ERROR');
CREATE TYPE event_type AS ENUM (
  'PAGE_VIEW','SESSION_START','TOOL_USED','GAME_PLAYED','AFFILIATE_CLICK',
  'AD_IMPRESSION','AD_CLICK','SCROLL_DEPTH','CONVERSION_EVENT','SEARCH'
);
CREATE TYPE rag_ingest_status AS ENUM ('PENDING','PROCESSING','COMPLETED','FAILED');
CREATE TYPE conversion_status AS ENUM ('PENDING','CONFIRMED','REJECTED','REFUNDED');

-- ─── A. Content (unified) ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contents (
  id                TEXT PRIMARY KEY,
  type              content_type NOT NULL,
  slug              TEXT NOT NULL,
  title             TEXT NOT NULL,
  excerpt           TEXT,
  body              TEXT,
  status            content_status NOT NULL DEFAULT 'DRAFT',
  render_strategy   render_strategy NOT NULL DEFAULT 'ISR',
  revalidate_sec    INT NOT NULL DEFAULT 3600,
  seo_title         TEXT,
  seo_description   TEXT,
  focus_keyword     TEXT,
  keywords          TEXT[] NOT NULL DEFAULT '{}',
  canonical_url     TEXT,
  og_image          TEXT,
  schema_type       TEXT,
  sitemap_priority  REAL NOT NULL DEFAULT 0.5,
  sitemap_changefreq TEXT NOT NULL DEFAULT 'weekly',
  index_status      index_status NOT NULL DEFAULT 'PENDING',
  last_indexed_at   TIMESTAMPTZ,
  metadata          JSONB NOT NULL DEFAULT '{}',
  published_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (type, slug)
);

CREATE INDEX IF NOT EXISTS idx_contents_type_status_published ON contents (type, status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_contents_status_updated ON contents (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_contents_index_type ON contents (index_status, type);

CREATE TABLE IF NOT EXISTS content_links (
  id          TEXT PRIMARY KEY,
  source_id   TEXT NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  target_id   TEXT NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  relation    link_relation NOT NULL DEFAULT 'RELATED',
  anchor_text TEXT,
  weight      INT NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_id, target_id, relation)
);
CREATE INDEX IF NOT EXISTS idx_content_links_target ON content_links (target_id);

-- ─── B. Embeddings (pgvector) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_chunks (
  id            TEXT PRIMARY KEY,
  content_id    TEXT NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  chunk_index   INT NOT NULL,
  chunk_text    TEXT NOT NULL,
  token_count   INT NOT NULL DEFAULT 0,
  content_type  content_type NOT NULL,
  slug          TEXT NOT NULL,
  title         TEXT NOT NULL,
  url           TEXT NOT NULL,
  keywords      TEXT[] NOT NULL DEFAULT '{}',
  section       TEXT,
  embedding     vector(1536),
  search_vector tsvector,
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (content_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_chunks_content_type ON content_chunks (content_type);
CREATE INDEX IF NOT EXISTS idx_chunks_slug ON content_chunks (slug);
CREATE INDEX IF NOT EXISTS idx_chunks_content_id ON content_chunks (content_id);

-- HNSW vector index (run after initial data load for faster build)
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw
  ON content_chunks USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_chunks_search_gin
  ON content_chunks USING gin (search_vector);

CREATE TABLE IF NOT EXISTS rag_ingest_jobs (
  id            TEXT PRIMARY KEY,
  content_id    TEXT,
  status        rag_ingest_status NOT NULL DEFAULT 'PENDING',
  chunks_total  INT NOT NULL DEFAULT 0,
  error         TEXT,
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rag_jobs_status ON rag_ingest_jobs (status, created_at DESC);

-- ─── C. Events (analytics) ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,
  email      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS visitors (
  id            TEXT PRIMARY KEY,
  user_id       TEXT REFERENCES users(id) ON DELETE SET NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_visitors_user ON visitors (user_id);
CREATE INDEX IF NOT EXISTS idx_visitors_last_seen ON visitors (last_seen_at DESC);

CREATE TABLE IF NOT EXISTS visitor_sessions (
  id           TEXT PRIMARY KEY,
  visitor_id   TEXT NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at     TIMESTAMPTZ,
  entry_path   TEXT,
  referrer     TEXT,
  utm_source   TEXT,
  utm_medium   TEXT,
  utm_campaign TEXT,
  device_type  TEXT,
  country      TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_visitor ON visitor_sessions (visitor_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_started ON visitor_sessions (started_at DESC);

-- Affiliate (before analytics_events FK)
CREATE TABLE IF NOT EXISTS affiliate_programs (
  id         TEXT PRIMARY KEY,
  slug       TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  network    TEXT,
  metadata   JSONB NOT NULL DEFAULT '{}',
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS affiliate_links (
  id          TEXT PRIMARY KEY,
  program_id  TEXT REFERENCES affiliate_programs(id) ON DELETE SET NULL,
  content_id  TEXT REFERENCES contents(id) ON DELETE SET NULL,
  label       TEXT NOT NULL,
  destination TEXT NOT NULL,
  tracking_id TEXT NOT NULL UNIQUE,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_content ON affiliate_links (content_id);

CREATE TABLE IF NOT EXISTS ad_placements (
  id         TEXT PRIMARY KEY,
  slot_key   TEXT NOT NULL UNIQUE,
  provider   TEXT NOT NULL,
  config     JSONB NOT NULL DEFAULT '{}',
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id                BIGSERIAL PRIMARY KEY,
  event_type        event_type NOT NULL,
  session_id        TEXT NOT NULL REFERENCES visitor_sessions(id) ON DELETE CASCADE,
  visitor_id        TEXT REFERENCES visitors(id) ON DELETE SET NULL,
  user_id           TEXT REFERENCES users(id) ON DELETE SET NULL,
  content_id        TEXT REFERENCES contents(id) ON DELETE SET NULL,
  affiliate_link_id TEXT REFERENCES affiliate_links(id) ON DELETE SET NULL,
  ad_placement_id   TEXT,
  path              TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_type_created ON analytics_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_content ON analytics_events (content_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_session ON analytics_events (session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_visitor ON analytics_events (visitor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_created ON analytics_events (created_at DESC);

-- Rollups (dashboard — avoid scanning raw events)
CREATE TABLE IF NOT EXISTS content_daily_stats (
  id                TEXT PRIMARY KEY,
  content_id        TEXT NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  date              DATE NOT NULL,
  page_views        INT NOT NULL DEFAULT 0,
  unique_visitors   INT NOT NULL DEFAULT 0,
  session_starts    INT NOT NULL DEFAULT 0,
  tool_uses         INT NOT NULL DEFAULT 0,
  game_plays        INT NOT NULL DEFAULT 0,
  affiliate_clicks  INT NOT NULL DEFAULT 0,
  ad_impressions    INT NOT NULL DEFAULT 0,
  ad_clicks         INT NOT NULL DEFAULT 0,
  conversions       INT NOT NULL DEFAULT 0,
  avg_scroll_depth  REAL,
  avg_time_on_page_sec REAL,
  UNIQUE (content_id, date)
);
CREATE INDEX IF NOT EXISTS idx_content_stats_date ON content_daily_stats (date DESC, page_views DESC);

CREATE TABLE IF NOT EXISTS affiliate_conversions (
  id                      TEXT PRIMARY KEY,
  affiliate_link_id       TEXT NOT NULL REFERENCES affiliate_links(id) ON DELETE CASCADE,
  session_id              TEXT,
  visitor_id              TEXT,
  external_transaction_id TEXT UNIQUE,
  revenue                 NUMERIC(12,2),
  commission              NUMERIC(12,2),
  currency                TEXT NOT NULL DEFAULT 'USD',
  status                  conversion_status NOT NULL DEFAULT 'PENDING',
  converted_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata                JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS affiliate_daily_stats (
  id                TEXT PRIMARY KEY,
  affiliate_link_id TEXT NOT NULL REFERENCES affiliate_links(id) ON DELETE CASCADE,
  date              DATE NOT NULL,
  clicks            INT NOT NULL DEFAULT 0,
  conversions       INT NOT NULL DEFAULT 0,
  revenue           NUMERIC(12,2) NOT NULL DEFAULT 0,
  UNIQUE (affiliate_link_id, date)
);

CREATE INDEX IF NOT EXISTS idx_affiliate_links_program ON affiliate_links (program_id, is_active);

-- ─── Tool cache ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tool_result_cache (
  id         TEXT PRIMARY KEY,
  tool_key   TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  output     TEXT NOT NULL,
  model      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE (tool_key, input_hash)
);
CREATE INDEX IF NOT EXISTS idx_tool_cache_expires ON tool_result_cache (expires_at);

CREATE TABLE IF NOT EXISTS page_performance_metrics (
  id          TEXT PRIMARY KEY,
  content_id  TEXT NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  session_id  TEXT,
  lcp_ms      REAL,
  fid_ms      REAL,
  cls         REAL,
  ttfb_ms     REAL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_perf_content ON page_performance_metrics (content_id, recorded_at DESC);

-- Fix forward reference: analytics_events.affiliate_link_id FK added after affiliate_links exists
-- (already created above — OK)

-- ─── RLS: public read published content; writes via service role only ────────
ALTER TABLE contents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published contents" ON contents
  FOR SELECT USING (status = 'PUBLISHED');

ALTER TABLE content_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read chunks" ON content_chunks FOR SELECT USING (true);

-- Service role bypasses RLS — used by Next.js API routes
