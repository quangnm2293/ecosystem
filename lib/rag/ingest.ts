import type { Content } from '@/lib/supabase/types';
import type { ContentType } from '@/lib/supabase/enums';
import { contentRepository } from '@/lib/repositories/content.repository';
import { ragRepository } from '@/lib/repositories/rag.repository';
import { SITE_URL } from '@/lib/config/site';
import { getContentPath } from '@/lib/routing/paths';
import { buildContentCorpus, chunkDocument } from '@/lib/rag/chunker';
import { embedTexts } from '@/lib/rag/embeddings';
import { getToolBySlug } from '@/modules/ai-tools/registry';

export type IngestResult = {
  contentId: string;
  slug: string;
  chunksWritten: number;
};

export async function ingestContentById(contentId: string): Promise<IngestResult> {
  const content = await contentRepository.findById(contentId);
  if (!content) throw new Error(`Content not found: ${contentId}`);
  return ingestContentRecord(content);
}

export async function ingestContentBySlug(type: ContentType, slug: string): Promise<IngestResult> {
  const content = await contentRepository.findPublishedByTypeSlug(type, slug);
  if (!content) throw new Error(`Content not found: ${type}/${slug}`);
  return ingestContentRecord(content);
}

export async function ingestAllPublished(): Promise<IngestResult[]> {
  const rows = await contentRepository.listAllPublished();
  return Promise.all(rows.map(ingestContentRecord));
}

async function ingestContentRecord(content: Content): Promise<IngestResult> {
  const url = `${SITE_URL}${getContentPath(content.type, content.slug)}`;
  const metadata = enrichMetadata(content);
  const corpus = buildContentCorpus({
    title: content.title,
    excerpt: content.excerpt,
    body: content.body,
    keywords: content.keywords,
    metadata,
  });

  const prefix = `[${content.type}] ${content.title}`;
  const textChunks = chunkDocument({ text: corpus, prefix });

  if (textChunks.length === 0) {
    await ragRepository.deleteChunksByContentId(content.id);
    return { contentId: content.id, slug: content.slug, chunksWritten: 0 };
  }

  const embeddings = await embedTexts(textChunks.map((c) => c.text));
  await ragRepository.deleteChunksByContentId(content.id);

  for (let i = 0; i < textChunks.length; i++) {
    const chunk = textChunks[i];
    await ragRepository.upsertChunk({
      id: `${content.id}_${i}`,
      contentId: content.id,
      chunkIndex: i,
      chunkText: chunk.text,
      tokenCount: chunk.tokenCount,
      contentType: content.type,
      slug: content.slug,
      title: content.title,
      url,
      keywords: content.keywords,
      section: chunk.section ?? null,
      embedding: embeddings[i],
      publishedAt: content.publishedAt?.toISOString() ?? null,
    });
  }

  return { contentId: content.id, slug: content.slug, chunksWritten: textChunks.length };
}

function enrichMetadata(content: Content): Record<string, unknown> {
  const meta = content.metadata ?? {};
  if (content.type === 'AI_TOOL') {
    const tool = getToolBySlug(content.slug);
    if (tool) {
      return { ...meta, seo: tool.seo, category: tool.category, description: tool.description };
    }
  }
  return meta;
}

export async function runIngestJob(contentId?: string) {
  const jobId = await ragRepository.createIngestJob(contentId);

  try {
    const results = contentId
      ? [await ingestContentById(contentId)]
      : await ingestAllPublished();

    const total = results.reduce((s, r) => s + r.chunksWritten, 0);
    await ragRepository.completeIngestJob(jobId, total);
    return { jobId, results, chunksTotal: total };
  } catch (err) {
    await ragRepository.failIngestJob(
      jobId,
      err instanceof Error ? err.message : 'Unknown error',
    );
    throw err;
  }
}
