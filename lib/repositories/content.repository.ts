import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { ContentStatus, type ContentType } from '@/lib/supabase/enums';
import {
  mapContent,
  type Content,
  type ContentRow,
} from '@/lib/supabase/types';

export type ContentWithLinks = Content & {
  outgoingLinks: Array<{
    anchorText: string | null;
    relation: string;
    target: Pick<Content, 'id' | 'type' | 'slug' | 'title' | 'excerpt'>;
  }>;
};

export const contentRepository = {
  async findPublishedBySlug(type: ContentType, slug: string): Promise<ContentWithLinks | null> {
    const sb = getSupabaseAdmin();

    const { data: row, error } = await sb
      .from('contents')
      .select('*')
      .eq('type', type)
      .eq('slug', slug)
      .eq('status', ContentStatus.PUBLISHED)
      .maybeSingle();

    if (error || !row) return null;

    const { data: linkRows } = await sb
      .from('content_links')
      .select('anchor_text, relation, weight, target_id')
      .eq('source_id', row.id)
      .order('weight', { ascending: false })
      .limit(10);

    const targetIds = (linkRows ?? []).map((l) => l.target_id as string);
    const { data: targets } = targetIds.length
      ? await sb.from('contents').select('id, type, slug, title, excerpt').in('id', targetIds)
      : { data: [] };

    const targetMap = new Map((targets ?? []).map((t) => [t.id as string, t]));
    const content = mapContent(row as ContentRow);

    return {
      ...content,
      outgoingLinks: (linkRows ?? []).map((l) => {
        const t = targetMap.get(l.target_id as string);
        return {
          anchorText: l.anchor_text as string | null,
          relation: l.relation as string,
          target: t
            ? {
                id: t.id as string,
                type: t.type as ContentType,
                slug: t.slug as string,
                title: t.title as string,
                excerpt: t.excerpt as string | null,
              }
            : { id: '', type: content.type, slug: '', title: '', excerpt: null },
        };
      }),
    };
  },

  async listPublished(
    types: ContentType | ContentType[],
    options: { limit?: number; offset?: number } = {},
  ) {
    const sb = getSupabaseAdmin();
    const typeList = Array.isArray(types) ? types : [types];

    const { data, error } = await sb
      .from('contents')
      .select('id, type, slug, title, excerpt, published_at, og_image, metadata')
      .eq('status', ContentStatus.PUBLISHED)
      .in('type', typeList)
      .order('published_at', { ascending: false })
      .range(options.offset ?? 0, (options.offset ?? 0) + (options.limit ?? 20) - 1);

    if (error) return [];

    return (data ?? []).map((r) => ({
      id: r.id as string,
      type: r.type as ContentType,
      slug: r.slug as string,
      title: r.title as string,
      excerpt: r.excerpt as string | null,
      publishedAt: r.published_at ? new Date(r.published_at as string) : null,
      ogImage: r.og_image as string | null,
      metadata: (r.metadata as Record<string, unknown>) ?? {},
    }));
  },

  async listPublishedForSitemap() {
    const sb = getSupabaseAdmin();
    const { data } = await sb
      .from('contents')
      .select('slug, type, updated_at')
      .eq('status', ContentStatus.PUBLISHED);

    return (data ?? []).map((r) => ({
      slug: r.slug as string,
      type: r.type as ContentType,
      updatedAt: new Date(r.updated_at as string),
    }));
  },

  async findById(id: string): Promise<Content | null> {
    const sb = getSupabaseAdmin();
    const { data } = await sb.from('contents').select('*').eq('id', id).maybeSingle();
    return data ? mapContent(data as ContentRow) : null;
  },

  async listAllPublished(): Promise<Content[]> {
    const sb = getSupabaseAdmin();
    const { data } = await sb.from('contents').select('*').eq('status', ContentStatus.PUBLISHED);
    return (data ?? []).map((r) => mapContent(r as ContentRow));
  },

  async findPublishedByTypeSlug(type: ContentType, slug: string): Promise<Content | null> {
    const sb = getSupabaseAdmin();
    const { data } = await sb
      .from('contents')
      .select('*')
      .eq('type', type)
      .eq('slug', slug)
      .eq('status', ContentStatus.PUBLISHED)
      .maybeSingle();
    return data ? mapContent(data as ContentRow) : null;
  },
};
