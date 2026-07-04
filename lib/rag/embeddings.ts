import { createHash } from 'crypto';
import { cacheGet, cacheSet, cacheKey } from '@/lib/cache/redis';
import { RAG_DEFAULTS } from '@/lib/rag/types';

const EMBEDDING_CACHE_TTL = 86400; // 24h

export async function embedTexts(texts: string[]): Promise<number[][]> {
  return Promise.all(texts.map((t) => embedText(t)));
}

export async function embedText(text: string): Promise<number[]> {
  const key = cacheKey('rag:emb', hashText(text));
  const cached = await cacheGet<number[]>(key);
  if (cached) return cached;

  const vector =
    process.env.OPENAI_API_KEY ? await openAiEmbed(text) : mockEmbed(text);

  await cacheSet(key, vector, EMBEDDING_CACHE_TTL);
  return vector;
}

function hashText(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 16);
}

async function openAiEmbed(text: string): Promise<number[]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.RAG_EMBEDDING_MODEL ?? RAG_DEFAULTS.embeddingModel,
      input: text.slice(0, 8000),
    }),
  });

  if (!res.ok) throw new Error(`Embedding API error: ${res.status}`);
  const data = (await res.json()) as { data: { embedding: number[] }[] };
  return data.data[0].embedding;
}

/** Deterministic mock vector for dev without API key */
function mockEmbed(text: string): number[] {
  const dim = RAG_DEFAULTS.embeddingDimensions;
  const vec = new Array(dim).fill(0);
  const normalized = text.toLowerCase();

  for (let i = 0; i < normalized.length; i++) {
    const code = normalized.charCodeAt(i);
    vec[i % dim] += (code * (i + 1)) / 1000;
  }

  // Boost dimensions from word hashes
  for (const word of normalized.split(/\s+/).slice(0, 32)) {
    const h = createHash('md5').update(word).digest();
    for (let j = 0; j < 8; j++) {
      vec[h[j] % dim] += h[j] / 255;
    }
  }

  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

export function vectorToPgLiteral(vec: number[]): string {
  return `[${vec.join(',')}]`;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}
