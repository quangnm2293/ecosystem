import { affiliateRepository } from '@/lib/repositories/affiliate.repository';
import { persistTrackEvent } from '@/lib/analytics/events';

export async function getAffiliateLinkByTrackingId(trackingId: string) {
  return affiliateRepository.findByTrackingId(trackingId);
}

export async function trackAffiliateClick(
  affiliateLinkId: string,
  meta: {
    sessionId: string;
    visitorId?: string;
    contentId?: string;
    path?: string;
    trackingId?: string;
  },
) {
  await persistTrackEvent({
    eventType: 'affiliate_click',
    sessionId: meta.sessionId,
    visitorId: meta.visitorId,
    contentId: meta.contentId,
    affiliateLinkId,
    path: meta.path,
    metadata: { tracking_id: meta.trackingId },
  });
}

export function affiliateRedirectUrl(trackingId: string): string {
  return `/go/${trackingId}`;
}
