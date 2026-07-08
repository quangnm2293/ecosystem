import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/trend-intelligence/api/errors';
import { serializeCategory } from '@/lib/trend-intelligence/api/serialize';
import { RegionQuerySchema } from '@/lib/trend-intelligence/schemas/api';
import { categoryRepository } from '@/lib/trend-intelligence';
import type { Region } from '@/lib/trend-intelligence/domain/value-objects/region';

/** GET /api/tiktok/categories?region=VN */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { region } = RegionQuerySchema.parse({ region: searchParams.get('region') ?? 'VN' });
    const categories = await categoryRepository.listByRegion(region as Region);
    return NextResponse.json({ categories: categories.map(serializeCategory) });
  } catch (err) {
    return handleApiError(err);
  }
}
