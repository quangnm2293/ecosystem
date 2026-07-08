import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/trend-intelligence/api/errors';
import { serializeProductWithMetrics } from '@/lib/trend-intelligence/api/serialize';
import { ProductQuerySchema } from '@/lib/trend-intelligence/schemas/api';
import { productRepository } from '@/lib/trend-intelligence';
import type { Region } from '@/lib/trend-intelligence/domain/value-objects/region';

type RouteContext = { params: Promise<{ slug: string }> };

/** GET /api/tiktok/products/[slug]?region=VN */
export async function GET(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const { searchParams } = new URL(request.url);
    const { region } = ProductQuerySchema.parse({ region: searchParams.get('region') ?? 'VN' });

    const product = await productRepository.findActiveBySlug(region as Region, slug);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ product: serializeProductWithMetrics(product) });
  } catch (err) {
    return handleApiError(err);
  }
}
