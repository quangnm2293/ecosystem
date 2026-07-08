import { NextResponse } from 'next/server';
import { isUser, requireUser } from '@/lib/auth/require-user';
import { handleApiError, apiError } from '@/lib/trend-intelligence/api/errors';
import {
  serializeProductWithMetrics,
  serializeWatchlistItem,
} from '@/lib/trend-intelligence/api/serialize';
import {
  FREE_MUTATION_RATE_LIMIT_PER_HOUR,
  WATCHLIST_LIMIT,
} from '@/lib/trend-intelligence/constants/tier-limits';
import { TiktokSubscriptionTier } from '@/lib/trend-intelligence/domain/enums';
import { checkMutationRateLimit } from '@/lib/trend-intelligence/rate-limit';
import {
  WatchlistAddBodySchema,
  WatchlistRemoveQuerySchema,
} from '@/lib/trend-intelligence/schemas/api';
import {
  productRepository,
  subscriptionRepository,
  watchlistRepository,
} from '@/lib/trend-intelligence';

/** GET /api/tiktok/watchlist */
export async function GET() {
  try {
    const userOrRes = await requireUser();
    if (!isUser(userOrRes)) return userOrRes;

    const watchlist = await watchlistRepository.getOrCreateForUser(userOrRes.id);
    const items = await watchlistRepository.listItems(watchlist.id);

    const products = await Promise.all(
      items.map(async (item) => {
        const product = await productRepository.findById(item.productId);
        return {
          ...serializeWatchlistItem(item),
          product: product ? serializeProductWithMetrics(product) : null,
        };
      }),
    );

    const tier = await subscriptionRepository.getTierForUser(userOrRes.id);
    return NextResponse.json({
      watchlistId: watchlist.id,
      tier,
      limit: WATCHLIST_LIMIT[tier],
      items: products,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/** POST /api/tiktok/watchlist */
export async function POST(request: Request) {
  try {
    const userOrRes = await requireUser();
    if (!isUser(userOrRes)) return userOrRes;

    const body = WatchlistAddBodySchema.parse(await request.json());
    const watchlist = await watchlistRepository.getOrCreateForUser(userOrRes.id);
    const items = await watchlistRepository.listItems(watchlist.id);
    const tier = await subscriptionRepository.getTierForUser(userOrRes.id);
    const limit = WATCHLIST_LIMIT[tier];

    if (tier === TiktokSubscriptionTier.FREE) {
      const rate = checkMutationRateLimit(
        `watchlist:${userOrRes.id}`,
        FREE_MUTATION_RATE_LIMIT_PER_HOUR,
      );
      if (!rate.allowed) {
        return apiError(`Rate limit. Retry in ${rate.retryAfterSec}s`, 429);
      }
    }

    if (items.length >= limit && !items.some((i) => i.productId === body.productId)) {
      return apiError(`Watchlist limit reached (${limit})`, 403);
    }

    const product = await productRepository.findById(body.productId);
    if (!product) return apiError('Product not found', 404);

    const item = await watchlistRepository.addItem({
      watchlistId: watchlist.id,
      productId: body.productId,
      notes: body.notes,
    });

    return NextResponse.json({ item: serializeWatchlistItem(item) }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

/** DELETE /api/tiktok/watchlist?productId=... */
export async function DELETE(request: Request) {
  try {
    const userOrRes = await requireUser();
    if (!isUser(userOrRes)) return userOrRes;

    const { searchParams } = new URL(request.url);
    const { productId } = WatchlistRemoveQuerySchema.parse({
      productId: searchParams.get('productId'),
    });

    const watchlist = await watchlistRepository.getOrCreateForUser(userOrRes.id);
    await watchlistRepository.removeItem(watchlist.id, productId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
