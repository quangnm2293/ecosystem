import type { DailyMetricPoint } from '@/lib/trend-intelligence/scoring/compute-scores';
import { getTiktokDb } from '@/lib/trend-intelligence/repositories/tiktok-db';

export type UpsertDailyMetricInput = {
  productId: string;
  day: string;
  salesCount?: number;
  videoCount?: number;
  creatorCount?: number;
  viewCount?: number;
  priceAmount?: number | null;
  commissionRate?: number | null;
  source?: string;
  raw?: Record<string, unknown>;
};

export type DailyMetricRow = {
  product_id: string;
  day: string;
  sales_count: number;
  video_count: number;
  creator_count: number;
  view_count: number;
  price_amount: number | null;
  commission_rate: number | null;
  source: string | null;
  raw: Record<string, unknown>;
};

export const metricsDailyRepository = {
  async upsertDay(input: UpsertDailyMetricInput): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await getTiktokDb().from('product_metrics_daily').upsert(
      {
        product_id: input.productId,
        day: input.day,
        sales_count: input.salesCount ?? 0,
        video_count: input.videoCount ?? 0,
        creator_count: input.creatorCount ?? 0,
        view_count: input.viewCount ?? 0,
        price_amount: input.priceAmount ?? null,
        commission_rate: input.commissionRate ?? null,
        source: input.source ?? null,
        raw: input.raw ?? {},
        updated_at: now,
      },
      { onConflict: 'product_id,day' },
    );
    if (error) throw error;
  },

  /** Newest first, limited to `days` rows */
  async listForProduct(productId: string, days = 14): Promise<DailyMetricPoint[]> {
    const { data, error } = await getTiktokDb()
      .from('product_metrics_daily')
      .select('*')
      .eq('product_id', productId)
      .order('day', { ascending: false })
      .limit(days);

    if (error) throw error;

    return ((data ?? []) as DailyMetricRow[]).map((row) => ({
      day: row.day,
      salesCount: Number(row.sales_count) || 0,
      videoCount: Number(row.video_count) || 0,
      creatorCount: Number(row.creator_count) || 0,
      viewCount: Number(row.view_count) || 0,
      priceAmount: row.price_amount,
      commissionRate: row.commission_rate,
    }));
  },
};
