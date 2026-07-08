import {
  mapProduct,
  mapProductMetrics,
} from '@/lib/trend-intelligence/domain/mappers';
import { TiktokProductStatus } from '@/lib/trend-intelligence/domain/enums';
import type {
  Product,
  ProductMetrics,
  ProductMetricsRow,
  ProductRow,
} from '@/lib/trend-intelligence/domain/types';
import type { Region } from '@/lib/trend-intelligence/domain/value-objects/region';
import { getTiktokDb } from '@/lib/trend-intelligence/repositories/tiktok-db';

export type ProductWithMetrics = Product & { metrics: ProductMetrics | null };

async function attachMetrics(products: Product[]): Promise<ProductWithMetrics[]> {
  if (products.length === 0) return [];

  const ids = products.map((p) => p.id);
  const { data, error } = await getTiktokDb()
    .from('product_metrics_current')
    .select('*')
    .in('product_id', ids);

  if (error) throw error;

  const metricsMap = new Map(
    (data as ProductMetricsRow[]).map((row) => [row.product_id, mapProductMetrics(row)]),
  );

  return products.map((product) => ({
    ...product,
    metrics: metricsMap.get(product.id) ?? null,
  }));
}

export const productRepository = {
  async findActiveBySlug(region: Region, slug: string): Promise<ProductWithMetrics | null> {
    const { data, error } = await getTiktokDb()
      .from('products')
      .select('*')
      .eq('region', region)
      .eq('slug', slug)
      .eq('status', TiktokProductStatus.ACTIVE)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const [withMetrics] = await attachMetrics([mapProduct(data as ProductRow)]);
    return withMetrics;
  },

  async findById(id: string): Promise<ProductWithMetrics | null> {
    const { data, error } = await getTiktokDb()
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const [withMetrics] = await attachMetrics([mapProduct(data as ProductRow)]);
    return withMetrics;
  },

  async listTopByOpportunity(
    region: Region,
    options: { categoryId?: string; limit?: number } = {},
  ): Promise<Array<Product & { metrics: ProductMetrics }>> {
    const limit = options.limit ?? 20;

    let metricsQuery = getTiktokDb()
      .from('product_metrics_current')
      .select('*, products!inner(*)')
      .eq('products.region', region)
      .eq('products.status', TiktokProductStatus.ACTIVE)
      .not('opportunity_score', 'is', null)
      .order('opportunity_score', { ascending: false })
      .limit(limit);

    if (options.categoryId) {
      metricsQuery = metricsQuery.eq('products.category_id', options.categoryId);
    }

    const { data, error } = await metricsQuery;
    if (error) throw error;

    return (data ?? []).map((row) => {
      const { products: productRow, ...metricsRow } = row as ProductMetricsRow & {
        products: ProductRow;
      };
      return {
        ...mapProduct(productRow),
        metrics: mapProductMetrics(metricsRow as ProductMetricsRow),
      };
    });
  },
};
