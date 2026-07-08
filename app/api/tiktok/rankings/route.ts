import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/trend-intelligence/api/errors';
import {
  serializeRanking,
  serializeRankedProduct,
} from '@/lib/trend-intelligence/api/serialize';
import { SUPPORTED_REGION } from '@/lib/trend-intelligence/domain/value-objects/region';
import { RankingsQuerySchema } from '@/lib/trend-intelligence/schemas/api';
import {
  categoryRepository,
  rankingRepository,
} from '@/lib/trend-intelligence';

/** GET /api/tiktok/rankings?categorySlug=beauty&rankDate=YYYY-MM-DD — Việt Nam only */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = RankingsQuerySchema.parse({
      categorySlug: searchParams.get('categorySlug') ?? undefined,
      rankDate: searchParams.get('rankDate') ?? undefined,
    });

    let categoryId: string | null | undefined = undefined;
    if (query.categorySlug) {
      const cat = await categoryRepository.findBySlug(SUPPORTED_REGION, query.categorySlug);
      if (!cat) {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 });
      }
      categoryId = cat.id;
    } else {
      categoryId = null;
    }

    const ranking = await rankingRepository.findLatest({
      region: SUPPORTED_REGION,
      categoryId,
      rankDate: query.rankDate,
    });

    if (!ranking) {
      return NextResponse.json({ region: SUPPORTED_REGION, ranking: null, products: [] });
    }

    const products = await rankingRepository.listRankedProducts(ranking.id);
    return NextResponse.json({
      region: SUPPORTED_REGION,
      ranking: serializeRanking(ranking),
      products: products.map(serializeRankedProduct),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
