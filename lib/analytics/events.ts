import {
  analyticsRepository,
  type PersistTrackInput,
} from '@/lib/repositories/analytics.repository';
import {
  EVENT_TYPE_MAP,
  type TrackEventInput,
} from '@/lib/analytics/schemas';

export type { PersistTrackInput };

export async function ensureTrackingIdentity(
  input: Parameters<typeof analyticsRepository.ensureTrackingIdentity>[0],
) {
  return analyticsRepository.ensureTrackingIdentity(input);
}

export async function persistTrackEvent(input: PersistTrackInput) {
  return analyticsRepository.insertEvent(input);
}

export async function persistTrackEvents(events: PersistTrackInput[]) {
  return analyticsRepository.insertEvents(events);
}

/** @deprecated */
export async function persistEvents(
  events: Array<{
    eventType: string;
    sessionId?: string;
    visitorId?: string;
    contentId?: string;
    affiliateLinkId?: string;
    path?: string;
    payload?: Record<string, unknown>;
  }>,
) {
  const typeMap: Record<string, TrackEventInput['event_type']> = {
    PAGE_VIEW: 'page_view',
    SESSION_START: 'session_start',
    TOOL_USAGE: 'tool_used',
    TOOL_USED: 'tool_used',
    GAME_PLAYED: 'game_played',
    AFFILIATE_CLICK: 'affiliate_click',
    AD_IMPRESSION: 'ad_impression',
    AD_CLICK: 'ad_click',
    SCROLL_DEPTH: 'scroll_depth',
    CONVERSION_EVENT: 'conversion_event',
    SEARCH: 'search',
  };

  return persistTrackEvents(
    events.map((e) => ({
      eventType: typeMap[e.eventType] ?? 'page_view',
      sessionId: e.sessionId ?? crypto.randomUUID(),
      visitorId: e.visitorId,
      contentId: e.contentId,
      affiliateLinkId: e.affiliateLinkId,
      path: e.path,
      metadata: e.payload,
    })),
  );
}

export { EVENT_TYPE_MAP };
