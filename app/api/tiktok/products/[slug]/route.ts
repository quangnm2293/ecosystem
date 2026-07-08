import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/trend-intelligence/api/errors';
import { serializeProductWithMetrics } from '@/lib/trend-intelligence/api/serialize';
import { SUPPORTED_REGION } from '@/lib/trend-intelligence/domain/value-objects/region';
import { productRepository } from '@/lib/trend-intelligence';

type RouteContext = { params: Promise<{ slug: string }> };

/** GET /api/tiktok/products/[slug] — Việt Nam only */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const product = await productRepository.findActiveBySlug(SUPPORTED_REGION, slug);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({
      region: SUPPORTED_REGION,
      product: serializeProductWithMetrics(product),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
