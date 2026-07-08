import { mapCategory } from '@/lib/trend-intelligence/domain/mappers';
import type { Category, CategoryRow } from '@/lib/trend-intelligence/domain/types';
import type { Region } from '@/lib/trend-intelligence/domain/value-objects/region';
import { getTiktokDb } from '@/lib/trend-intelligence/repositories/tiktok-db';

export const categoryRepository = {
  async listByRegion(region: Region): Promise<Category[]> {
    const { data, error } = await getTiktokDb()
      .from('categories')
      .select('*')
      .eq('region', region)
      .order('slug');

    if (error) throw error;
    return (data as CategoryRow[]).map(mapCategory);
  },

  async findBySlug(region: Region, slug: string): Promise<Category | null> {
    const { data, error } = await getTiktokDb()
      .from('categories')
      .select('*')
      .eq('region', region)
      .eq('slug', slug)
      .maybeSingle();

    if (error) throw error;
    return data ? mapCategory(data as CategoryRow) : null;
  },
};
