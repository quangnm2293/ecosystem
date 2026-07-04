import type { ContentType } from '@/lib/supabase/enums';
import type { ContentWithLinks } from '@/lib/content/service';
import { InternalLinks } from '@/lib/content/internal-links';
import { JsonLdScript } from '@/lib/seo/json-ld';
import { buildArticleJsonLd, buildBreadcrumbJsonLd } from '@/lib/seo/metadata';
import { getContentPath, getVerticalBasePath } from '@/lib/routing/paths';
import { AdSlot } from '@/components/ads/AdSlot';
import { AffiliateButton } from '@/lib/affiliate/components';
import { CompareMetadataSchema } from '@/lib/content/types';

type ContentPageProps = {
  content: ContentWithLinks;
  verticalLabel: string;
};

export function ContentPageShell({ content, verticalLabel }: ContentPageProps) {
  const path = getContentPath(content.type, content.slug);
  const basePath = getVerticalBasePath(content.type);

  const jsonLd = [
    buildBreadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: verticalLabel, path: basePath },
      { name: content.title, path },
    ]),
    buildArticleJsonLd({
      title: content.title,
      description: content.excerpt ?? content.seoDescription ?? undefined,
      path,
      publishedAt: content.publishedAt,
      updatedAt: content.updatedAt,
      image: content.ogImage ?? undefined,
    }),
  ];

  const compareMeta =
    content.type === 'COMPARE'
      ? CompareMetadataSchema.safeParse(content.metadata).data
      : undefined;

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <JsonLdScript data={jsonLd} />

      <header>
        <p className="text-sm font-medium text-primary">{verticalLabel}</p>
        <h1 className="ui-page-title mt-2">{content.title}</h1>
        {content.excerpt && (
          <p className="mt-4 text-lg text-muted-foreground">{content.excerpt}</p>
        )}
      </header>

      <AdSlot slotKey="content-top" className="my-8" />

      {content.body && (
        <div
          className="ui-prose mt-8"
          dangerouslySetInnerHTML={{ __html: content.body }}
        />
      )}

      {compareMeta?.products.map((product, i) => (
        <section key={i} className="ui-card mt-8 p-6">
          <h2 className="ui-section-title">{product.name}</h2>
          {product.affiliateTrackingId && (
            <div className="mt-4">
              <AffiliateButton trackingId={product.affiliateTrackingId} label="Xem giá" />
            </div>
          )}
        </section>
      ))}

      <AdSlot slotKey="content-bottom" className="my-8" />

      <InternalLinks
        links={content.outgoingLinks.map((l) => ({
          anchorText: l.anchorText,
          target: l.target,
        }))}
      />
    </article>
  );
}

export function contentTypesFilter(types: ContentType | ContentType[]): ContentType[] {
  return Array.isArray(types) ? types : [types];
}
