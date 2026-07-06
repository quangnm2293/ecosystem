'use client';

import { ExternalLink, Percent, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ToolStructuredResult } from '@/modules/ai-tools/types';

const SOURCE_LABELS: Record<string, string> = {
  'fastmoss-api': 'FastMoss API',
  crawl: 'Crawl',
  'tiktok-oembed': 'TikTok',
  'ai-estimate': 'AI ước tính',
};

function formatCommission(val?: string): string {
  if (!val) return '—';
  const trimmed = val.trim();
  if (trimmed.endsWith('%')) return trimmed;
  return `${trimmed}%`;
}

function growthTone(growth?: string): 'up' | 'neutral' {
  if (!growth) return 'neutral';
  const n = parseFloat(growth.replace(/[^0-9.-]/g, ''));
  return !Number.isNaN(n) && n > 0 ? 'up' : 'neutral';
}

function rankTone(rank: number): string {
  if (rank === 1) return 'bg-amber-500/20 text-amber-700 dark:text-amber-300 ring-amber-500/30';
  if (rank === 2) return 'bg-slate-400/20 text-slate-700 dark:text-slate-300 ring-slate-400/30';
  if (rank === 3) return 'bg-orange-600/20 text-orange-800 dark:text-orange-200 ring-orange-600/30';
  return 'bg-muted text-muted-foreground ring-border';
}

type ProductRankResultProps = {
  data: Extract<ToolStructuredResult, { kind: 'tiktok-product-rank' }>;
};

export function ProductRankResult({ data }: ProductRankResultProps) {
  const sourceLabel = SOURCE_LABELS[data.source] ?? data.source;
  const updated = new Date(data.fetchedAt).toLocaleString('vi-VN');

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-foreground">
            Sản phẩm bán chạy TikTok Shop
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.items.length} sản phẩm · Cập nhật {updated}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{sourceLabel}</Badge>
          <Badge variant="outline" className="gap-1">
            <TrendingUp className="size-3" />
            BXH affiliate
          </Badge>
        </div>
      </div>

      {data.note && (
        <p className="rounded-lg border border-border-muted bg-surface-muted px-4 py-3 text-sm text-muted-foreground">
          {data.note}
        </p>
      )}

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-border-muted md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-muted bg-surface-muted/80 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 w-12">#</th>
              <th className="px-4 py-3">Sản phẩm</th>
              <th className="px-4 py-3">Giá</th>
              <th className="px-4 py-3">Doanh thu 7d</th>
              <th className="px-4 py-3">Tăng trưởng</th>
              <th className="px-4 py-3">Hoa hồng</th>
              <th className="px-4 py-3">Shop</th>
              <th className="px-4 py-3 text-right">Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-muted">
            {data.items.map((p) => (
              <tr key={p.rank} className="bg-surface transition-colors hover:bg-muted/40">
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex size-8 items-center justify-center rounded-full text-xs font-bold ring-1 ring-inset ${rankTone(p.rank)}`}
                  >
                    {p.rank}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{p.title}</div>
                  {p.category && (
                    <div className="mt-0.5 text-xs text-muted-foreground">{p.category}</div>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-foreground">{p.price ?? '—'}</td>
                <td className="px-4 py-3 whitespace-nowrap font-medium text-primary">
                  {p.revenue7d ?? p.sales7d ?? '—'}
                </td>
                <td className="px-4 py-3">
                  {p.growth ? (
                    <Badge
                      variant="outline"
                      className={
                        growthTone(p.growth) === 'up'
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          : ''
                      }
                    >
                      {p.growth}
                    </Badge>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 font-semibold text-secondary-foreground">
                    <Percent className="size-3.5 text-primary" />
                    {formatCommission(p.commissionPercent)}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{p.shopName ?? '—'}</td>
                <td className="px-4 py-3 text-right">
                  {p.productUrl ? (
                    <Link
                      href={p.productUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                    >
                      <ExternalLink className="size-3.5" />
                      Mở
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="grid gap-3 md:hidden">
        {data.items.map((p) => (
          <article
            key={p.rank}
            className="rounded-xl border border-border-muted bg-surface p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-3">
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ring-1 ring-inset ${rankTone(p.rank)}`}
                >
                  {p.rank}
                </span>
                <div>
                  <h4 className="font-semibold text-foreground leading-snug">{p.title}</h4>
                  {p.category && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{p.category}</p>
                  )}
                  <p className="mt-1 text-sm text-muted-foreground">{p.shopName}</p>
                </div>
              </div>
              {p.growth && (
                <Badge
                  variant="outline"
                  className={
                    growthTone(p.growth) === 'up'
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700'
                      : ''
                  }
                >
                  {p.growth}
                </Badge>
              )}
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Giá</dt>
                <dd className="font-medium">{p.price ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Doanh thu 7d</dt>
                <dd className="font-medium text-primary">{p.revenue7d ?? p.sales7d ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Hoa hồng</dt>
                <dd className="font-semibold text-primary">{formatCommission(p.commissionPercent)}</dd>
              </div>
            </dl>

            {p.productUrl && (
              <Link
                href={p.productUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'mt-4 w-full')}
              >
                <ExternalLink className="size-3.5" />
                Xem sản phẩm
              </Link>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
