import '@/lib/ai/adapters';
import type { ContentType } from '@/lib/supabase/enums';
import { aiComplete } from '@/lib/ai/provider';
import { SITE_NAME } from '@/lib/config/site';
import { truncateToTokens } from '@/lib/rag/chunking';
import {
  filtersToKey,
  getCachedRagResponse,
  setCachedRagResponse,
} from '@/lib/rag/cache';
import { fillSystemPrompt, buildRagUserPrompt, RAG_FALLBACK_ANSWER } from '@/lib/rag/prompt';
import { filterByThreshold, hybridRetrieve } from '@/lib/rag/retrieve';
import { sanitizeQuestion, wrapContextBlock } from '@/lib/rag/sanitize';
import type { RagQueryInput, RagQueryResponse } from '@/lib/rag/types';
import { RAG_DEFAULTS } from '@/lib/rag/types';

export async function executeRagQuery(input: RagQueryInput): Promise<RagQueryResponse> {
  const question = sanitizeQuestion(input.question);
  const filtersKey = filtersToKey({
    contentTypes: normalizeTypes(input.filters?.contentTypes),
    category: input.filters?.category,
  });

  const cached = await getCachedRagResponse(question, filtersKey);
  if (cached) return { ...cached, cached: true };

  const start = Date.now();
  const contentTypes = normalizeTypes(input.filters?.contentTypes);

  const retrieved = await hybridRetrieve({
    question,
    contentTypes,
    topK: input.topK ?? RAG_DEFAULTS.topK,
  });

  const aboveThreshold = filterByThreshold(retrieved);

  if (aboveThreshold.length === 0) {
    const fallback: RagQueryResponse = {
      answer: RAG_FALLBACK_ANSWER,
      sources: [],
      chunks: [],
      cached: false,
      retrievalMs: Date.now() - start,
      model: 'none',
      fallback: true,
    };
    return fallback;
  }

  const contextBlocks = buildContextWindow(aboveThreshold);
  const systemPrompt = fillSystemPrompt(SITE_NAME);
  const userPrompt = buildRagUserPrompt(question, contextBlocks);

  const model = process.env.RAG_CHAT_MODEL ?? process.env.AI_DEFAULT_MODEL ?? 'gpt-4o-mini';
  let answer: string;

  try {
    answer = await aiComplete(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { model, temperature: 0.2, maxTokens: 800 },
    );
  } catch {
    answer = buildExtractiveFallback(aboveThreshold);
  }

  const sources = dedupeSources(aboveThreshold);
  const chunks = aboveThreshold.map((c) => ({
    id: c.id,
    text: c.chunkText.slice(0, 300),
    score: c.finalScore,
    metadata: {
      contentType: c.contentType,
      slug: c.slug,
      title: c.title,
      url: c.url,
      section: c.section,
    },
  }));

  const response: RagQueryResponse = {
    answer,
    sources,
    chunks,
    cached: false,
    retrievalMs: Date.now() - start,
    model,
    fallback: false,
  };

  await setCachedRagResponse(question, filtersKey, response);
  return response;
}

function normalizeTypes(types?: ContentType | ContentType[]): ContentType[] | undefined {
  if (!types) return undefined;
  return Array.isArray(types) ? types : [types];
}

function buildContextWindow(chunks: { chunkText: string }[]): string[] {
  let usedTokens = 0;
  const blocks: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const wrapped = wrapContextBlock(
      truncateToTokens(chunks[i].chunkText, 600),
      i + 1,
    );
    const tokens = Math.ceil(wrapped.length / 4);
    if (usedTokens + tokens > RAG_DEFAULTS.maxContextTokens) break;
    blocks.push(wrapped);
    usedTokens += tokens;
  }

  return blocks;
}

function dedupeSources(chunks: { id: string; title: string; slug: string; url: string; contentType: ContentType; finalScore: number }[]) {
  const map = new Map<string, (typeof chunks)[0]>();
  for (const c of chunks) {
    const key = c.url;
    if (!map.has(key) || map.get(key)!.finalScore < c.finalScore) {
      map.set(key, c);
    }
  }
  return [...map.values()].map((c) => ({
    id: c.id,
    title: c.title,
    slug: c.slug,
    url: c.url,
    contentType: c.contentType,
    score: c.finalScore,
  }));
}

function buildExtractiveFallback(chunks: { chunkText: string; title: string; url: string }[]): string {
  const snippet = chunks[0].chunkText.slice(0, 400);
  return `Dựa trên nội dung nền tảng (${chunks[0].title}):\n\n${snippet}…\n\nNguồn: ${chunks[0].url}`;
}
