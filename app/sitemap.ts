import type { MetadataRoute } from 'next';
import { ContentStatus } from '@/lib/supabase/enums';
import { contentRepository } from '@/lib/repositories/content.repository';
import { SITE_URL } from '@/lib/config/site';
import { getContentPath } from '@/lib/routing/paths';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/blog`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/tools`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/compare`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/games`, changeFrequency: 'weekly', priority: 0.7 },
  ];

  try {
    const rows = await contentRepository.listPublishedForSitemap();
    const dynamicPages: MetadataRoute.Sitemap = rows.map((row) => ({
      url: `${SITE_URL}${getContentPath(row.type, row.slug)}`,
      lastModified: row.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.6,
    }));
    return [...staticPages, ...dynamicPages];
  } catch {
    return staticPages;
  }
}
