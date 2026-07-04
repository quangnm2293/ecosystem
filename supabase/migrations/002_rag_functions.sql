-- RAG RPC functions — cosine similarity + FTS + chunk upsert

CREATE OR REPLACE FUNCTION match_content_chunks_semantic(
  query_embedding vector(1536),
  match_count int DEFAULT 20,
  filter_types text[] DEFAULT NULL
)
RETURNS TABLE (
  id text,
  chunk_text text,
  content_type text,
  slug text,
  title text,
  url text,
  section text,
  semantic_score float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    c.id,
    c.chunk_text,
    c.content_type::text,
    c.slug,
    c.title,
    c.url,
    c.section,
    (1 - (c.embedding <=> query_embedding))::float AS semantic_score
  FROM content_chunks c
  WHERE c.embedding IS NOT NULL
    AND (filter_types IS NULL OR c.content_type::text = ANY(filter_types))
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

CREATE OR REPLACE FUNCTION match_content_chunks_keyword(
  search_query text,
  match_count int DEFAULT 20,
  filter_types text[] DEFAULT NULL
)
RETURNS TABLE (
  id text,
  chunk_text text,
  content_type text,
  slug text,
  title text,
  url text,
  section text,
  keyword_score float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    c.id,
    c.chunk_text,
    c.content_type::text,
    c.slug,
    c.title,
    c.url,
    c.section,
    ts_rank(c.search_vector, plainto_tsquery('simple', search_query))::float AS keyword_score
  FROM content_chunks c
  WHERE c.search_vector @@ plainto_tsquery('simple', search_query)
    AND (filter_types IS NULL OR c.content_type::text = ANY(filter_types))
  ORDER BY keyword_score DESC
  LIMIT match_count;
$$;

CREATE OR REPLACE FUNCTION upsert_content_chunk(
  p_id text,
  p_content_id text,
  p_chunk_index int,
  p_chunk_text text,
  p_token_count int,
  p_content_type text,
  p_slug text,
  p_title text,
  p_url text,
  p_keywords text[],
  p_section text,
  p_embedding vector(1536),
  p_published_at timestamptz
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO content_chunks (
    id, content_id, chunk_index, chunk_text, token_count,
    content_type, slug, title, url, keywords, section,
    embedding, search_vector, published_at, created_at, updated_at
  ) VALUES (
    p_id, p_content_id, p_chunk_index, p_chunk_text, p_token_count,
    p_content_type::content_type, p_slug, p_title, p_url, p_keywords, p_section,
    p_embedding, to_tsvector('simple', p_chunk_text), p_published_at, NOW(), NOW()
  )
  ON CONFLICT (content_id, chunk_index) DO UPDATE SET
    chunk_text = EXCLUDED.chunk_text,
    token_count = EXCLUDED.token_count,
    embedding = EXCLUDED.embedding,
    search_vector = EXCLUDED.search_vector,
    updated_at = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION match_content_chunks_semantic TO service_role;
GRANT EXECUTE ON FUNCTION match_content_chunks_keyword TO service_role;
GRANT EXECUTE ON FUNCTION upsert_content_chunk TO service_role;
