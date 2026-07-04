import type { Metadata } from 'next';
import { SITE_NAME, SITE_URL, DEFAULT_OG_IMAGE, SITE_LOCALE } from '@/lib/config/site';

export type SeoInput = {
  title: string;
  description?: string;
  path: string;
  canonicalUrl?: string;
  ogImage?: string;
  noIndex?: boolean;
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
};

export function buildMetadata(input: SeoInput): Metadata {
  const canonical = input.canonicalUrl ?? `${SITE_URL}${input.path}`;
  const title = input.title.includes(SITE_NAME) ? input.title : `${input.title} | ${SITE_NAME}`;

  return {
    title,
    description: input.description,
    alternates: { canonical },
    robots: input.noIndex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title,
      description: input.description,
      url: canonical,
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
      type: input.type ?? 'website',
      images: [{ url: input.ogImage ?? DEFAULT_OG_IMAGE }],
      ...(input.publishedTime && { publishedTime: input.publishedTime }),
      ...(input.modifiedTime && { modifiedTime: input.modifiedTime }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: input.description,
      images: [input.ogImage ?? DEFAULT_OG_IMAGE],
    },
  };
}

export type JsonLd = Record<string, unknown>;

export function buildWebSiteJsonLd(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function buildArticleJsonLd(input: {
  title: string;
  description?: string;
  path: string;
  publishedAt?: Date | null;
  updatedAt?: Date;
  image?: string;
}): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.title,
    description: input.description,
    url: `${SITE_URL}${input.path}`,
    datePublished: input.publishedAt?.toISOString(),
    dateModified: input.updatedAt?.toISOString(),
    image: input.image ?? DEFAULT_OG_IMAGE,
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
  };
}

export function buildSoftwareAppJsonLd(input: {
  name: string;
  description?: string;
  path: string;
}): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: input.name,
    description: input.description,
    url: `${SITE_URL}${input.path}`,
    applicationCategory: 'WebApplication',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  };
}

export function buildBreadcrumbJsonLd(items: { name: string; path: string }[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}
