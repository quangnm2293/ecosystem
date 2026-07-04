import { createHash } from 'crypto';
import { cacheGet, cacheSet, cacheKey } from '@/lib/cache/redis';
import type { RagQueryResponse } from '@/lib/rag/types';

const RESPONSE_TTL = 3600; // 1h
const SEARCH_TTL = 300; // 5m

export function hashQuery(question: string, filtersKey: string): string {
  return createHash('sha256').update(`${question}:${filtersKey}`).digest('hex').slice(0, 20);
}

export async function getCachedRagResponse(
  question: string,
  filtersKey: string,
): Promise<RagQueryResponse | null> {
  return cacheGet<RagQueryResponse>(cacheKey('rag:resp', hashQuery(question, filtersKey)));
}

export async function setCachedRagResponse(
  question: string,
  filtersKey: string,
  response: RagQueryResponse,
): Promise<void> {
  await cacheSet(cacheKey('rag:resp', hashQuery(question, filtersKey)), response, RESPONSE_TTL);
}

export async function getCachedSearch<T>(searchKey: string): Promise<T | null> {
  return cacheGet<T>(cacheKey('rag:search', searchKey));
}

export async function setCachedSearch<T>(searchKey: string, results: T): Promise<void> {
  await cacheSet(cacheKey('rag:search', searchKey), results, SEARCH_TTL);
}

export function filtersToKey(filters?: { contentTypes?: string[]; category?: string }): string {
  const types = filters?.contentTypes?.sort().join(',') ?? 'all';
  return `${types}:${filters?.category ?? ''}`;
}
