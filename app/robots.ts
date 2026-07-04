import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/config/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/go/'] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
