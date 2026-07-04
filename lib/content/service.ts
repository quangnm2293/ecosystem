import { contentRepository, type ContentWithLinks } from '@/lib/repositories/content.repository';
import type { ContentType } from '@/lib/supabase/enums';
import { ContentStatus } from '@/lib/supabase/enums';
import { getContentPath } from '@/lib/routing/paths';
import { cacheGet, cacheSet, cacheKey } from '@/lib/cache/redis';

export type { Content } from '@/lib/supabase/types';
export type { ContentWithLinks } from '@/lib/repositories/content.repository';

const CONTENT_TTL = 300;

export async function getPublishedContent(
  type: ContentType,
  slug: string,
): Promise<ContentWithLinks | null> {
  const key = cacheKey('content', type, slug);
  const cached = await cacheGet<ContentWithLinks>(key);
  if (cached) return cached;

  const content = await contentRepository.findPublishedBySlug(type, slug);
  if (content) await cacheSet(key, content, CONTENT_TTL);
  return content;
}

export async function listPublishedContent(
  types: ContentType | ContentType[],
  options: { limit?: number; offset?: number } = {},
) {
  return contentRepository.listPublished(types, options);
}

export async function getContentSlugsForStaticParams(type: ContentType, limit = 100) {
  const rows = await contentRepository.listPublished(type, { limit });
  return rows.map((r) => ({ slug: r.slug }));
}

export async function revalidateContent(type: ContentType, slug: string) {
  const { revalidatePath } = await import('next/cache');
  revalidatePath(getContentPath(type, slug));
  await cacheSet(cacheKey('content', type, slug), null, 0);
}

export type CreateContentInput = {
  type: ContentType;
  slug: string;
  title: string;
  excerpt?: string;
  body?: string;
  metadata?: Record<string, unknown>;
  seoTitle?: string;
  seoDescription?: string;
};

/** CMS hook — insert via Supabase admin */
export async function upsertContentDraft(input: CreateContentInput) {
  const { getSupabaseAdmin } = await import('@/lib/supabase/admin');
  const sb = getSupabaseAdmin();

  const { data, error } = await sb
    .from('contents')
    .upsert(
      {
        type: input.type,
        slug: input.slug,
        title: input.title,
        excerpt: input.excerpt ?? null,
        body: input.body ?? null,
        metadata: input.metadata ?? {},
        seo_title: input.seoTitle ?? null,
        seo_description: input.seoDescription ?? null,
        status: ContentStatus.DRAFT,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'type,slug' },
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}
