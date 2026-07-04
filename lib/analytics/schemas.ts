import { z } from 'zod';

/** Client → API event shape (snake_case trong metadata, UPPER_SNAKE enum ở server) */
export const TrackEventSchema = z.object({
  event_type: z.enum([
    'page_view',
    'session_start',
    'tool_used',
    'game_played',
    'affiliate_click',
    'ad_impression',
    'ad_click',
    'scroll_depth',
    'conversion_event',
    'search',
  ]),
  session_id: z.string().min(1),
  visitor_id: z.string().optional(),
  user_id: z.string().optional(),
  content_id: z.string().optional(),
  affiliate_link_id: z.string().optional(),
  ad_placement_id: z.string().optional(),
  path: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.string().datetime().optional(),
});

export const TrackBatchSchema = z.object({
  events: z.array(TrackEventSchema).min(1).max(50),
});

export type TrackEventInput = z.infer<typeof TrackEventSchema>;

export const EVENT_TYPE_MAP = {
  page_view: 'PAGE_VIEW',
  session_start: 'SESSION_START',
  tool_used: 'TOOL_USED',
  game_played: 'GAME_PLAYED',
  affiliate_click: 'AFFILIATE_CLICK',
  ad_impression: 'AD_IMPRESSION',
  ad_click: 'AD_CLICK',
  scroll_depth: 'SCROLL_DEPTH',
  conversion_event: 'CONVERSION_EVENT',
  search: 'SEARCH',
} as const;
