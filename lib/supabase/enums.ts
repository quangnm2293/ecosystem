/** Database enums — mirror Supabase PostgreSQL enums (single source of truth) */

export const ContentType = {
  BLOG: 'BLOG',
  AI_TOOL: 'AI_TOOL',
  DEV_TOOL: 'DEV_TOOL',
  GAME: 'GAME',
  COMPARE: 'COMPARE',
} as const;
export type ContentType = (typeof ContentType)[keyof typeof ContentType];

export const ContentStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
} as const;
export type ContentStatus = (typeof ContentStatus)[keyof typeof ContentStatus];

export const EventType = {
  PAGE_VIEW: 'PAGE_VIEW',
  SESSION_START: 'SESSION_START',
  TOOL_USED: 'TOOL_USED',
  GAME_PLAYED: 'GAME_PLAYED',
  AFFILIATE_CLICK: 'AFFILIATE_CLICK',
  AD_IMPRESSION: 'AD_IMPRESSION',
  AD_CLICK: 'AD_CLICK',
  SCROLL_DEPTH: 'SCROLL_DEPTH',
  CONVERSION_EVENT: 'CONVERSION_EVENT',
  SEARCH: 'SEARCH',
} as const;
export type EventType = (typeof EventType)[keyof typeof EventType];

export const RagIngestStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;
export type RagIngestStatus = (typeof RagIngestStatus)[keyof typeof RagIngestStatus];

export const IndexStatus = {
  PENDING: 'PENDING',
  INDEXED: 'INDEXED',
  NOINDEX: 'NOINDEX',
  ERROR: 'ERROR',
} as const;
export type IndexStatus = (typeof IndexStatus)[keyof typeof IndexStatus];

export const LinkRelation = {
  RELATED: 'RELATED',
  SEE_ALSO: 'SEE_ALSO',
  COMPARE_TO: 'COMPARE_TO',
  TOOL_FOR: 'TOOL_FOR',
} as const;
export type LinkRelation = (typeof LinkRelation)[keyof typeof LinkRelation];

export const ConversionStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  REJECTED: 'REJECTED',
  REFUNDED: 'REFUNDED',
} as const;
export type ConversionStatus = (typeof ConversionStatus)[keyof typeof ConversionStatus];

export const RenderStrategy = {
  SSG: 'SSG',
  ISR: 'ISR',
  SSR: 'SSR',
} as const;
export type RenderStrategy = (typeof RenderStrategy)[keyof typeof RenderStrategy];
