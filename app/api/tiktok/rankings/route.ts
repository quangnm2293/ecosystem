import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/trend-intelligence/api/errors';
import {
  serializeRanking,
  serializeRankedProduct,
} from '@/lib/trend-intelligence/api/serialize';
import { RankingsQuerySchema } from '@/lib/trend-intelligence/schemas/api';
import {
  categoryRepository,
  rankingRepository,
} from '@/lib/trend-intelligence';
import type { Region } from '@/lib/trend-intelligence/domain/value-objects/region';

/** GET /api/tiktok/rankings?region=VN&categorySlug=beauty&rankDate=2026-07-07 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = RankingsQuerySchema.parse({
      region: searchParams.get('region') ?? 'VN',
      categorySlug: searchParams.get('categorySlug') ?? undefined,
      rankDate: searchParams.get('rankDate') ?? undefined,
    });

    let categoryId: string | null | undefined = undefined;
    if (query.categorySlug) {
      const cat = await categoryRepository.findBySlug(query.region as Region, query.categorySlug);
      if (!cat) {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 });
      }
      categoryId = cat.id;
    } else {
      categoryId = null;
    }

    const ranking = await rankingRepository.findLatest({
      region: query.region as Region,
      categoryId,
      rankDate: query.rankDate,
    });

    if (!ranking) {
      return NextResponse.json({ ranking: null, products: [] });
    }

    const products = await rankingRepository.listRankedProducts(ranking.id);
    return NextResponse.json({
      ranking: serializeRanking(ranking),
      products: products.map(serializeRankedProduct),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
