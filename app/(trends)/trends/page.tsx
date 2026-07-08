import Link from 'next/link';
import { AdSlot } from '@/components/ads/AdSlot';
import { buildMetadata } from '@/lib/seo/metadata';
import {
  categoryRepository,
  rankingRepository,
} from '@/lib/trend-intelligence';
import {
  serializeCategory,
  serializeRankedProduct,
  serializeRanking,
} from '@/lib/trend-intelligence/api/serialize';
import { SUPPORTED_REGION } from '@/lib/trend-intelligence/domain/value-objects/region';

export const revalidate = 1800;

export const metadata = buildMetadata({
  title: 'TikTok Trend Rankings Việt Nam',
  description: 'BXH sản phẩm TikTok Shop Việt Nam theo danh mục — opportunity & trend score.',
  path: '/trends',
});

type SearchParams = Promise<{ category?: string }>;

function formatScore(n: number) {
  return n.toFixed(1);
}

function formatPrice(amount: number | null | undefined, currency = 'VND') {
  if (amount == null) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(
    amount,
  );
}

export default async function TrendsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const region = SUPPORTED_REGION;
  const categorySlug = params.category;

  let categories: ReturnType<typeof serializeCategory>[] = [];
  let ranking: ReturnType<typeof serializeRanking> | null = null;
  let products: ReturnType<typeof serializeRankedProduct>[] = [];
  let loadError: string | null = null;

  try {
    const cats = await categoryRepository.listByRegion(region);
    categories = cats.map(serializeCategory);

    const selected =
      categorySlug != null
        ? cats.find((c) => c.slug === categorySlug) ?? null
        : cats[0] ?? null;

    if (selected) {
      const latest = await rankingRepository.findLatest({
        region,
        categoryId: selected.id,
      });
      if (latest) {
        ranking = serializeRanking(latest);
        const ranked = await rankingRepository.listRankedProducts(latest.id);
        products = ranked.map(serializeRankedProduct);
      }
    }
  } catch (err) {
    loadError = err instanceof Error ? err.message : 'Không tải được dữ liệu';
  }

  const activeSlug = categorySlug ?? categories[0]?.slug;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <span className="ui-badge">Trend Intelligence</span>
      <h1 className="ui-page-title mt-2">TikTok Trend Rankings</h1>
      <p className="mt-2 text-muted-foreground">
        Bảng xếp hạng sản phẩm TikTok Shop theo danh mục — cập nhật từ crawl pipeline.
      </p>

      <AdSlot slotKey="list-top" className="mt-6" />

      {loadError && (
        <p className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {loadError}
        </p>
      )}

      {categories.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2">
          {categories.map((cat) => {
            const active = cat.slug === activeSlug;
            return (
              <Link
                key={cat.id}
                href={`/trends?category=${cat.slug}`}
                className={
                  active
                    ? 'rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground'
                    : 'rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground'
                }
              >
                {cat.name}
              </Link>
            );
          })}
        </div>
      )}

      {ranking && (
        <p className="mt-4 text-sm text-muted-foreground">
          Ngày xếp hạng: <span className="font-medium text-foreground">{ranking.rankDate}</span>
          {' · '}
          Region: Việt Nam (VN)
        </p>
      )}

      {products.length === 0 && !loadError ? (
        <div className="mt-10 ui-card p-6">
          <p className="font-medium">Chưa có dữ liệu ranking.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Enqueue crawl jobs rồi chạy tick worker (xem docs Epic 31), hoặc đợi cron hàng ngày.
          </p>
          <Link href="/tools/tiktok-shop" className="mt-4 inline-block text-sm text-primary underline">
            Phân tích on-demand →
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {products.map((p) => (
            <li key={p.id} className="ui-card flex gap-4 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                #{p.rank}
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/trends/products/${p.slug}`}
                  className="font-semibold text-foreground hover:text-primary"
                >
                  {p.title}
                </Link>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span>{formatPrice(p.price?.amount, p.price?.currency)}</span>
                  <span>Opportunity {formatScore(p.metrics.scores.opportunityScore)}</span>
                  <span>Trend {formatScore(p.metrics.scores.trendScore)}</span>
                  {p.commissionRate != null && (
                    <span>HH {(p.commissionRate * 100).toFixed(0)}%</span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-10 text-center text-sm text-muted-foreground">
        Cần phân tích nhanh 1 SP?{' '}
        <Link href="/tools/tiktok-shop" className="text-primary underline">
          TikTok Shop tools
        </Link>
        {' · '}
        <Link href="/trends/admin" className="text-primary underline">
          Admin jobs
        </Link>
      </p>
    </div>
  );
}
