import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { EVENT_TYPE_MAP, type TrackEventInput } from '@/lib/analytics/schemas';
import type { EventType } from '@/lib/supabase/enums';
import type { AnalyticsEventInsert } from '@/lib/supabase/types';

export type PersistTrackInput = {
  eventType: TrackEventInput['event_type'];
  sessionId: string;
  visitorId?: string;
  userId?: string;
  contentId?: string;
  affiliateLinkId?: string;
  adPlacementId?: string;
  path?: string;
  metadata?: Record<string, unknown>;
  timestamp?: string;
};

function toDbEventType(eventType: TrackEventInput['event_type']): EventType {
  return EVENT_TYPE_MAP[eventType] as EventType;
}

function toRow(input: PersistTrackInput): AnalyticsEventInsert {
  return {
    event_type: toDbEventType(input.eventType),
    session_id: input.sessionId,
    visitor_id: input.visitorId ?? null,
    user_id: input.userId ?? null,
    content_id: input.contentId ?? null,
    affiliate_link_id: input.affiliateLinkId ?? null,
    ad_placement_id: input.adPlacementId ?? null,
    path: input.path ?? null,
    metadata: input.metadata ?? {},
    ...(input.timestamp ? { created_at: input.timestamp } : {}),
  };
}

export const analyticsRepository = {
  async ensureTrackingIdentity(input: {
    visitorId?: string;
    sessionId: string;
    userId?: string;
    entryPath?: string;
    referrer?: string;
  }) {
    const sb = getSupabaseAdmin();
    const visitorKey = input.visitorId ?? input.sessionId;

    await sb.from('visitor_sessions').upsert(
      {
        id: input.sessionId,
        visitor_id: visitorKey,
        entry_path: input.entryPath ?? null,
        referrer: input.referrer ?? null,
      },
      { onConflict: 'id' },
    );

    await sb.from('visitors').upsert(
      {
        id: visitorKey,
        user_id: input.userId ?? null,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );
  },

  async insertEvent(input: PersistTrackInput) {
    const sb = getSupabaseAdmin();
    const { error } = await sb.from('analytics_events').insert(toRow(input));
    if (error) throw error;
  },

  async insertEvents(events: PersistTrackInput[]) {
    if (events.length === 0) return { count: 0 };

    const first = events[0];
    await analyticsRepository.ensureTrackingIdentity({
      visitorId: first.visitorId,
      sessionId: first.sessionId,
      userId: first.userId,
      entryPath: first.path,
      referrer: first.metadata?.referrer as string | undefined,
    });

    const sb = getSupabaseAdmin();
    const { error } = await sb.from('analytics_events').insert(events.map(toRow));
    if (error) throw error;
    return { count: events.length };
  },
};
