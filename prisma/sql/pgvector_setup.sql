-- Supabase SQL Editor: chạy TRƯỚC khi db push / migrate
-- Enables pgvector + FTS indexes for hybrid RAG search

CREATE EXTENSION IF NOT EXISTS vector;

-- IVFFlat index — build sau khi có >1000 chunks (lists = sqrt(n))
-- CREATE INDEX CONCURRENTLY content_chunks_embedding_ivfflat
--   ON content_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- HNSW — preferred at scale (Supabase pgvector 0.5+)
CREATE INDEX IF NOT EXISTS content_chunks_embedding_hnsw
  ON content_chunks USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS content_chunks_search_vector_gin
  ON content_chunks USING gin (search_vector);

-- Trigger-free: search_vector updated in ingest pipeline via raw SQL
