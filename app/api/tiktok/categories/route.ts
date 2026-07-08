import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/trend-intelligence/api/errors';
import { serializeCategory } from '@/lib/trend-intelligence/api/serialize';
import { SUPPORTED_REGION } from '@/lib/trend-intelligence/domain/value-objects/region';
import { categoryRepository } from '@/lib/trend-intelligence';

/** GET /api/tiktok/categories — luôn Việt Nam */
export async function GET() {
  try {
    const categories = await categoryRepository.listByRegion(SUPPORTED_REGION);
    return NextResponse.json({
      region: SUPPORTED_REGION,
      categories: categories.map(serializeCategory),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
