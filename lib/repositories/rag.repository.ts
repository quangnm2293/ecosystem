import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { ContentType } from '@/lib/supabase/enums';
import { RagIngestStatus } from '@/lib/supabase/enums';
import type { RagChunkRow } from '@/lib/supabase/types';
import { RAG_DEFAULTS, type RetrievedChunk } from '@/lib/rag/types';

export const ragRepository = {
  /** Semantic search via Supabase RPC (pgvector cosine) */
  async searchSemantic(
    queryEmbedding: number[],
    options: { contentTypes?: ContentType[]; limit?: number },
  ): Promise<RagChunkRow[]> {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb.rpc('match_content_chunks_semantic', {
      query_embedding: queryEmbedding,
      match_count: options.limit ?? RAG_DEFAULTS.retrievePool,
      filter_types: options.contentTypes ?? null,
    });

    if (error) {
      console.warn('[RAG] semantic search:', error.message);
      return [];
    }
    return (data ?? []) as RagChunkRow[];
  },

  /** Keyword search via Supabase RPC (Postgres FTS) */
  async searchKeyword(
    query: string,
    options: { contentTypes?: ContentType[]; limit?: number },
  ): Promise<RagChunkRow[]> {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb.rpc('match_content_chunks_keyword', {
      search_query: query,
      match_count: options.limit ?? RAG_DEFAULTS.retrievePool,
      filter_types: options.contentTypes ?? null,
    });

    if (error) {
      console.warn('[RAG] keyword search:', error.message);
      return [];
    }
    return (data ?? []) as RagChunkRow[];
  },

  async deleteChunksByContentId(contentId: string) {
    const sb = getSupabaseAdmin();
    await sb.from('content_chunks').delete().eq('content_id', contentId);
  },

  async upsertChunk(params: {
    id: string;
    contentId: string;
    chunkIndex: number;
    chunkText: string;
    tokenCount: number;
    contentType: ContentType;
    slug: string;
    title: string;
    url: string;
    keywords: string[];
    section: string | null;
    embedding: number[];
    publishedAt: string | null;
  }) {
    const sb = getSupabaseAdmin();
    const { error } = await sb.rpc('upsert_content_chunk', {
      p_id: params.id,
      p_content_id: params.contentId,
      p_chunk_index: params.chunkIndex,
      p_chunk_text: params.chunkText,
      p_token_count: params.tokenCount,
      p_content_type: params.contentType,
      p_slug: params.slug,
      p_title: params.title,
      p_url: params.url,
      p_keywords: params.keywords,
      p_section: params.section,
      p_embedding: params.embedding,
      p_published_at: params.publishedAt,
    });

    if (error) throw error;
  },

  async createIngestJob(contentId?: string) {
    const sb = getSupabaseAdmin();
    const jobId = crypto.randomUUID();
    const { error } = await sb.from('rag_ingest_jobs').insert({
      id: jobId,
      content_id: contentId ?? null,
      status: RagIngestStatus.PROCESSING,
      started_at: new Date().toISOString(),
    });

    if (error) throw error;
    return jobId;
  },

  async completeIngestJob(jobId: string, chunksTotal: number) {
    const sb = getSupabaseAdmin();
    await sb
      .from('rag_ingest_jobs')
      .update({
        status: RagIngestStatus.COMPLETED,
        chunks_total: chunksTotal,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  },

  async failIngestJob(jobId: string, errorMessage: string) {
    const sb = getSupabaseAdmin();
    await sb
      .from('rag_ingest_jobs')
      .update({
        status: RagIngestStatus.FAILED,
        error: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  },
};

export function mapRagRowsToRetrieved(
  semantic: RagChunkRow[],
  keyword: RagChunkRow[],
): RetrievedChunk[] {
  const map = new Map<string, RetrievedChunk>();
  const maxKw = Math.max(...keyword.map((k) => k.keyword_score ?? 0), 0.001);

  for (const row of semantic) {
    map.set(row.id, {
      id: row.id,
      chunkText: row.chunk_text,
      semanticScore: Number(row.semantic_score) || 0,
      keywordScore: 0,
      finalScore: 0,
      contentType: row.content_type,
      slug: row.slug,
      title: row.title,
      url: row.url,
      section: row.section,
    });
  }

  for (const row of keyword) {
    const normalizedKw = (Number(row.keyword_score) || 0) / maxKw;
    const existing = map.get(row.id);
    if (existing) {
      existing.keywordScore = normalizedKw;
    } else {
      map.set(row.id, {
        id: row.id,
        chunkText: row.chunk_text,
        semanticScore: 0,
        keywordScore: normalizedKw,
        finalScore: 0,
        contentType: row.content_type,
        slug: row.slug,
        title: row.title,
        url: row.url,
        section: row.section,
      });
    }
  }

  return [...map.values()].map((c) => ({
    ...c,
    finalScore:
      RAG_DEFAULTS.semanticWeight * c.semanticScore +
      RAG_DEFAULTS.keywordWeight * c.keywordScore,
  }));
}
