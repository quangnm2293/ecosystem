import { NextResponse } from 'next/server';
import { getAffiliateLinkByTrackingId, trackAffiliateClick } from '@/lib/affiliate/service';

type Params = { params: Promise<{ trackingId: string }> };

/** Public affiliate redirect — /go/:trackingId */
export async function GET(request: Request, { params }: Params) {
  const { trackingId } = await params;
  const link = await getAffiliateLinkByTrackingId(trackingId);

  if (!link) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const url = new URL(request.url);
  const sessionId = url.searchParams.get('sid') ?? crypto.randomUUID();

  await trackAffiliateClick(link.id, {
    sessionId,
    visitorId: url.searchParams.get('vid') ?? undefined,
    contentId: link.contentId ?? undefined,
    path: url.searchParams.get('from') ?? undefined,
    trackingId,
  });

  const dest = new URL(link.destination);
  dest.searchParams.set('sub_id', trackingId);

  return NextResponse.redirect(dest.toString(), { status: 302 });
}
