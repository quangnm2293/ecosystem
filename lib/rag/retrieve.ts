import type { ContentType } from '@/lib/supabase/enums';
import { embedText } from '@/lib/rag/embeddings';
import { RAG_DEFAULTS, type RetrievedChunk } from '@/lib/rag/types';
import { getCachedSearch, setCachedSearch } from '@/lib/rag/cache';
import { ragRepository, mapRagRowsToRetrieved } from '@/lib/repositories/rag.repository';

type SearchOptions = {
  question: string;
  contentTypes?: ContentType[];
  topK?: number;
};

export async function hybridRetrieve(options: SearchOptions): Promise<RetrievedChunk[]> {
  const pool = RAG_DEFAULTS.retrievePool;
  const topK = options.topK ?? RAG_DEFAULTS.topK;
  const searchCacheKey = `${options.contentTypes?.join(',') ?? 'all'}:${options.question}`;

  const cached = await getCachedSearch<RetrievedChunk[]>(searchCacheKey);
  if (cached) return cached.slice(0, topK);

  const queryEmbedding = await embedText(options.question);

  const [semantic, keyword] = await Promise.all([
    ragRepository.searchSemantic(queryEmbedding, {
      contentTypes: options.contentTypes,
      limit: pool,
    }),
    ragRepository.searchKeyword(options.question, {
      contentTypes: options.contentTypes,
      limit: pool,
    }),
  ]);

  const merged = mapRagRowsToRetrieved(semantic, keyword);
  const ranked = rerankChunks(merged, options.contentTypes);

  await setCachedSearch(searchCacheKey, ranked);
  return ranked.slice(0, topK);
}

function rerankChunks(chunks: RetrievedChunk[], contentTypes?: ContentType[]): RetrievedChunk[] {
  const filtered = chunks.filter((c) => c.finalScore >= RAG_DEFAULTS.similarityThreshold * 0.5);
  const typeBoost = contentTypes?.length ? 0.05 : 0;

  const boosted = filtered.map((c) => ({
    ...c,
    finalScore: c.finalScore + (contentTypes?.includes(c.contentType) ? typeBoost : 0),
  }));

  boosted.sort((a, b) => b.finalScore - a.finalScore);

  const seenSlug = new Set<string>();
  const deduped: RetrievedChunk[] = [];
  for (const chunk of boosted) {
    const key = `${chunk.contentType}:${chunk.slug}`;
    if (seenSlug.has(key) && deduped.filter((d) => d.slug === chunk.slug).length >= 2) continue;
    seenSlug.add(key);
    deduped.push(chunk);
  }
  return deduped;
}

export function filterByThreshold(chunks: RetrievedChunk[]): RetrievedChunk[] {
  return chunks.filter((c) => c.finalScore >= RAG_DEFAULTS.similarityThreshold);
}
