import type {
  ContentStatus,
  ContentType,
  EventType,
  IndexStatus,
  LinkRelation,
  RagIngestStatus,
  RenderStrategy,
} from '@/lib/supabase/enums';

/** Application-layer types (camelCase) — mapped from Supabase snake_case rows */

export type ContentRow = {
  id: string;
  type: ContentType;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string | null;
  status: ContentStatus;
  render_strategy: RenderStrategy;
  revalidate_sec: number;
  seo_title: string | null;
  seo_description: string | null;
  focus_keyword: string | null;
  keywords: string[];
  canonical_url: string | null;
  og_image: string | null;
  schema_type: string | null;
  sitemap_priority: number;
  sitemap_changefreq: string;
  index_status: IndexStatus;
  last_indexed_at: string | null;
  metadata: Record<string, unknown>;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Content = {
  id: string;
  type: ContentType;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string | null;
  status: ContentStatus;
  renderStrategy: RenderStrategy;
  revalidateSec: number;
  seoTitle: string | null;
  seoDescription: string | null;
  focusKeyword: string | null;
  keywords: string[];
  canonicalUrl: string | null;
  ogImage: string | null;
  schemaType: string | null;
  sitemapPriority: number;
  sitemapChangefreq: string;
  indexStatus: IndexStatus;
  lastIndexedAt: Date | null;
  metadata: Record<string, unknown>;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AffiliateLinkRow = {
  id: string;
  program_id: string | null;
  content_id: string | null;
  label: string;
  destination: string;
  tracking_id: string;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type AffiliateLink = {
  id: string;
  programId: string | null;
  contentId: string | null;
  label: string;
  destination: string;
  trackingId: string;
  isActive: boolean;
  metadata: Record<string, unknown>;
};

export type AnalyticsEventInsert = {
  event_type: EventType;
  session_id: string;
  visitor_id?: string | null;
  user_id?: string | null;
  content_id?: string | null;
  affiliate_link_id?: string | null;
  ad_placement_id?: string | null;
  path?: string | null;
  metadata?: Record<string, unknown>;
  created_at?: string;
};

export type RagChunkRow = {
  id: string;
  chunk_text: string;
  content_type: ContentType;
  slug: string;
  title: string;
  url: string;
  section: string | null;
  semantic_score?: number;
  keyword_score?: number;
};

export type ToolCacheRow = {
  id: string;
  tool_key: string;
  input_hash: string;
  output: string;
  model: string | null;
  expires_at: string;
};

export function mapContent(row: ContentRow): Content {
  return {
    id: row.id,
    type: row.type,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    body: row.body,
    status: row.status,
    renderStrategy: row.render_strategy,
    revalidateSec: row.revalidate_sec,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    focusKeyword: row.focus_keyword,
    keywords: row.keywords ?? [],
    canonicalUrl: row.canonical_url,
    ogImage: row.og_image,
    schemaType: row.schema_type,
    sitemapPriority: row.sitemap_priority,
    sitemapChangefreq: row.sitemap_changefreq,
    indexStatus: row.index_status,
    lastIndexedAt: row.last_indexed_at ? new Date(row.last_indexed_at) : null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    publishedAt: row.published_at ? new Date(row.published_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function mapAffiliateLink(row: AffiliateLinkRow): AffiliateLink {
  return {
    id: row.id,
    programId: row.program_id,
    contentId: row.content_id,
    label: row.label,
    destination: row.destination,
    trackingId: row.tracking_id,
    isActive: row.is_active,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  };
}
