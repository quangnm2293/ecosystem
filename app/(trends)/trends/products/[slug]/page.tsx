import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdSlot } from '@/components/ads/AdSlot';
import { buildMetadata } from '@/lib/seo/metadata';
import { SUPPORTED_REGION } from '@/lib/trend-intelligence/domain/value-objects/region';
import { productRepository } from '@/lib/trend-intelligence';
import { serializeProductWithMetrics } from '@/lib/trend-intelligence/api/serialize';

export const revalidate = 1800;

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const region = SUPPORTED_REGION;

  try {
    const product = await productRepository.findActiveBySlug(region, slug);
    if (!product) {
      return buildMetadata({ title: 'Product', path: `/trends/products/${slug}`, noIndex: true });
    }
    return buildMetadata({
      title: product.title,
      description: `TikTok Shop Việt Nam · Opportunity ${product.metrics?.scores.opportunityScore ?? '—'}`,
      path: `/trends/products/${product.slug}`,
    });
  } catch {
    return buildMetadata({ title: 'Product', path: `/trends/products/${slug}`, noIndex: true });
  }
}

function formatPrice(amount: number | null | undefined, currency = 'VND') {
  if (amount == null) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(
    amount,
  );
}

export default async function TrendProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const region = SUPPORTED_REGION;

  const row = await productRepository.findActiveBySlug(region, slug);
  if (!row) notFound();

  const product = serializeProductWithMetrics(row);
  const m = product.metrics;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/trends" className="text-sm text-primary underline">
        ← Rankings
      </Link>

      <h1 className="ui-page-title mt-4">{product.title}</h1>
      <p className="mt-2 text-muted-foreground">
        Việt Nam · {formatPrice(product.price?.amount, product.price?.currency)}
        {product.commissionRate != null && ` · Hoa hồng ${(product.commissionRate * 100).toFixed(0)}%`}
      </p>

      <AdSlot slotKey="content-top" className="mt-6" />

      {m ? (
        <dl className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="ui-card p-4">
            <dt className="text-sm text-muted-foreground">Opportunity score</dt>
            <dd className="mt-1 text-2xl font-semibold text-primary">
              {m.scores.opportunityScore.toFixed(1)}
            </dd>
          </div>
          <div className="ui-card p-4">
            <dt className="text-sm text-muted-foreground">Trend score</dt>
            <dd className="mt-1 text-2xl font-semibold">{m.scores.trendScore.toFixed(1)}</dd>
          </div>
          <div className="ui-card p-4">
            <dt className="text-sm text-muted-foreground">Sales</dt>
            <dd className="mt-1 text-xl font-medium">{m.salesCount.toLocaleString('vi-VN')}</dd>
          </div>
          <div className="ui-card p-4">
            <dt className="text-sm text-muted-foreground">Videos / Creators</dt>
            <dd className="mt-1 text-xl font-medium">
              {m.videoCount} / {m.creatorCount}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="mt-8 text-muted-foreground">Chưa có metrics cho sản phẩm này.</p>
      )}

      {product.productUrl && (
        <a
          href={product.productUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Xem trên TikTok Shop
        </a>
      )}
    </div>
  );
}
