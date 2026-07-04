import type { ContentType } from '@/lib/supabase/enums';

export type RagContentFilter = ContentType | ContentType[];

export type RagQueryInput = {
  question: string;
  filters?: {
    contentTypes?: RagContentFilter;
    category?: string;
  };
  visitorId?: string;
  sessionId?: string;
  topK?: number;
};

export type RagSource = {
  id: string;
  title: string;
  slug: string;
  url: string;
  contentType: ContentType;
  score: number;
};

export type RagChunkResult = {
  id: string;
  text: string;
  score: number;
  metadata: {
    contentType: ContentType;
    slug: string;
    title: string;
    url: string;
    section?: string | null;
  };
};

export type RagQueryResponse = {
  answer: string;
  sources: RagSource[];
  chunks: RagChunkResult[];
  cached: boolean;
  retrievalMs: number;
  model: string;
  fallback: boolean;
};

export type RetrievedChunk = {
  id: string;
  chunkText: string;
  semanticScore: number;
  keywordScore: number;
  finalScore: number;
  contentType: ContentType;
  slug: string;
  title: string;
  url: string;
  section: string | null;
};

export const RAG_DEFAULTS = {
  topK: 5,
  retrievePool: 20,
  semanticWeight: 0.7,
  keywordWeight: 0.3,
  similarityThreshold: 0.55,
  maxContextTokens: 3000,
  maxQuestionLength: 500,
  embeddingDimensions: 1536,
  embeddingModel: 'text-embedding-3-small',
} as const;
