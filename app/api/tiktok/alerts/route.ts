import { NextResponse } from 'next/server';
import { isUser, requireUser } from '@/lib/auth/require-user';
import { handleApiError, apiError } from '@/lib/trend-intelligence/api/errors';
import {
  ALERT_LIMIT,
  FREE_MUTATION_RATE_LIMIT_PER_HOUR,
} from '@/lib/trend-intelligence/constants/tier-limits';
import { TiktokSubscriptionTier } from '@/lib/trend-intelligence/domain/enums';
import { checkMutationRateLimit } from '@/lib/trend-intelligence/rate-limit';
import { AlertCreateBodySchema } from '@/lib/trend-intelligence/schemas/api';
import { alertRepository } from '@/lib/trend-intelligence/repositories/alert.repository';
import { subscriptionRepository } from '@/lib/trend-intelligence';

function serializeAlert(a: Awaited<ReturnType<typeof alertRepository.listByUser>>[number]) {
  return {
    id: a.id,
    ruleType: a.ruleType,
    ruleParams: a.ruleParams,
    channels: a.channels,
    status: a.status,
    lastTriggered: a.lastTriggered?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
  };
}

/** GET /api/tiktok/alerts */
export async function GET() {
  try {
    const userOrRes = await requireUser();
    if (!isUser(userOrRes)) return userOrRes;

    const tier = await subscriptionRepository.getTierForUser(userOrRes.id);
    const alerts = await alertRepository.listByUser(userOrRes.id);
    return NextResponse.json({
      tier,
      limit: ALERT_LIMIT[tier],
      alerts: alerts.map(serializeAlert),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/** POST /api/tiktok/alerts */
export async function POST(request: Request) {
  try {
    const userOrRes = await requireUser();
    if (!isUser(userOrRes)) return userOrRes;

    const body = AlertCreateBodySchema.parse(await request.json());
    const tier = await subscriptionRepository.getTierForUser(userOrRes.id);

    if (tier === TiktokSubscriptionTier.FREE) {
      const rate = checkMutationRateLimit(
        `alert:${userOrRes.id}`,
        FREE_MUTATION_RATE_LIMIT_PER_HOUR,
      );
      if (!rate.allowed) {
        return apiError(`Rate limit. Retry in ${rate.retryAfterSec}s`, 429);
      }
    }

    const active = await alertRepository.countActiveByUser(userOrRes.id);
    const limit = ALERT_LIMIT[tier];
    if (active >= limit) {
      return apiError(`Alert limit reached (${limit})`, 403);
    }

    const alert = await alertRepository.create({
      userId: userOrRes.id,
      ruleType: body.ruleType,
      ruleParams: {
        threshold: body.threshold,
        ...(body.productId ? { productId: body.productId } : {}),
      },
      channels: body.channels,
    });

    return NextResponse.json({ alert: serializeAlert(alert) }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

/** DELETE /api/tiktok/alerts?id=... */
export async function DELETE(request: Request) {
  try {
    const userOrRes = await requireUser();
    if (!isUser(userOrRes)) return userOrRes;

    const id = new URL(request.url).searchParams.get('id');
    if (!id) return apiError('Missing id', 400);

    await alertRepository.delete(userOrRes.id, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
