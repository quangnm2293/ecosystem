import { NextResponse } from 'next/server';
import { affiliateRepository } from '@/lib/repositories/affiliate.repository';
import { persistTrackEvent } from '@/lib/analytics/events';

type Params = { params: Promise<{ trackingId: string }> };

/** GET /api/redirect/:trackingId — affiliate tracking + redirect */
export async function GET(request: Request, { params }: Params) {
  const { trackingId } = await params;
  const url = new URL(request.url);

  const link = await affiliateRepository.findByTrackingId(trackingId);

  if (!link) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const sessionId = url.searchParams.get('sid') ?? crypto.randomUUID();
  const visitorId = url.searchParams.get('vid') ?? undefined;
  const fromPath = url.searchParams.get('from') ?? undefined;

  await persistTrackEvent({
    eventType: 'affiliate_click',
    sessionId,
    visitorId,
    contentId: link.contentId ?? undefined,
    affiliateLinkId: link.id,
    path: fromPath,
    metadata: {
      tracking_id: trackingId,
      program_id: link.programId,
      label: link.label,
      user_agent: request.headers.get('user-agent'),
      referer: request.headers.get('referer'),
    },
  });

  const dest = new URL(link.destination);
  dest.searchParams.set('sub_id', trackingId);

  return NextResponse.redirect(dest.toString(), { status: 302 });
}
