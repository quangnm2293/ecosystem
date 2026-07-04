import { NextResponse } from 'next/server';
import { TrackBatchSchema } from '@/lib/analytics/schemas';
import { persistTrackEvents } from '@/lib/analytics/events';

/**
 * POST /api/track
 * Body: { events: [{ event_type, session_id, visitor_id?, metadata?, ... }] }
 *
 * Client batching: gửi 5–20 events/lần, keepalive on pagehide.
 * Scale hook: swap body → Redis LPUSH → worker flush batch insert.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { events } = TrackBatchSchema.parse(body);

    const ipCountry = request.headers.get('x-vercel-ip-country') ?? undefined;

    await persistTrackEvents(
      events.map((e) => ({
        eventType: e.event_type,
        sessionId: e.session_id,
        visitorId: e.visitor_id,
        userId: e.user_id,
        contentId: e.content_id,
        affiliateLinkId: e.affiliate_link_id,
        adPlacementId: e.ad_placement_id,
        path: e.path,
        metadata: {
          ...e.metadata,
          ...(ipCountry ? { country: ipCountry } : {}),
        },
        timestamp: e.timestamp,
      })),
    );

    return NextResponse.json({ ok: true, received: events.length });
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}
