/** TikTok trend intelligence enums — mirror `tiktok_*` PostgreSQL enums */

export const TiktokProductStatus = {
  ACTIVE: 'ACTIVE',
  DELISTED: 'DELISTED',
  UNKNOWN: 'UNKNOWN',
} as const;
export type TiktokProductStatus =
  (typeof TiktokProductStatus)[keyof typeof TiktokProductStatus];

export const TiktokCrawlStatus = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;
export type TiktokCrawlStatus = (typeof TiktokCrawlStatus)[keyof typeof TiktokCrawlStatus];

export const TiktokAlertStatus = {
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  TRIGGERED: 'TRIGGERED',
} as const;
export type TiktokAlertStatus = (typeof TiktokAlertStatus)[keyof typeof TiktokAlertStatus];

export const TiktokSubscriptionTier = {
  FREE: 'FREE',
  PRO: 'PRO',
  AGENCY: 'AGENCY',
  ENTERPRISE: 'ENTERPRISE',
} as const;
export type TiktokSubscriptionTier =
  (typeof TiktokSubscriptionTier)[keyof typeof TiktokSubscriptionTier];

export const TiktokSubscriptionStatus = {
  ACTIVE: 'ACTIVE',
  CANCELLED: 'CANCELLED',
  PAST_DUE: 'PAST_DUE',
} as const;
export type TiktokSubscriptionStatus =
  (typeof TiktokSubscriptionStatus)[keyof typeof TiktokSubscriptionStatus];

export const TiktokNotificationStatus = {
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
  BOUNCED: 'BOUNCED',
} as const;
export type TiktokNotificationStatus =
  (typeof TiktokNotificationStatus)[keyof typeof TiktokNotificationStatus];
