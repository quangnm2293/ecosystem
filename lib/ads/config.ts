/** Vị trí quảng cáo trên site — map tới AdSense ad unit (env). */

export const AD_PLACEMENTS = {
  'home-mid': {
    label: 'Trang chủ — giữa trang',
    format: 'auto' as const,
    responsive: true,
    slotEnv: 'NEXT_PUBLIC_ADSENSE_SLOT_HOME',
    minHeight: 90,
  },
  'list-top': {
    label: 'Danh sách — đầu trang',
    format: 'auto' as const,
    responsive: true,
    slotEnv: 'NEXT_PUBLIC_ADSENSE_SLOT_LIST',
    minHeight: 90,
  },
  'content-top': {
    label: 'Bài viết — đầu nội dung',
    format: 'auto' as const,
    responsive: true,
    slotEnv: 'NEXT_PUBLIC_ADSENSE_SLOT_CONTENT',
    minHeight: 90,
  },
  'content-bottom': {
    label: 'Bài viết — cuối nội dung',
    format: 'auto' as const,
    responsive: true,
    slotEnv: 'NEXT_PUBLIC_ADSENSE_SLOT_CONTENT',
    minHeight: 90,
  },
  'tool-top': {
    label: 'Tool — trên form',
    format: 'auto' as const,
    responsive: true,
    slotEnv: 'NEXT_PUBLIC_ADSENSE_SLOT_TOOL',
    minHeight: 90,
  },
  'tool-middle': {
    label: 'Tool — giữa form/kết quả',
    format: 'auto' as const,
    responsive: true,
    slotEnv: 'NEXT_PUBLIC_ADSENSE_SLOT_TOOL',
    minHeight: 90,
  },
  'tool-result': {
    label: 'Tool — dưới kết quả',
    format: 'auto' as const,
    responsive: true,
    slotEnv: 'NEXT_PUBLIC_ADSENSE_SLOT_TOOL',
    minHeight: 90,
  },
  'tool-footer': {
    label: 'Tool — cuối trang',
    format: 'auto' as const,
    responsive: true,
    slotEnv: 'NEXT_PUBLIC_ADSENSE_SLOT_TOOL',
    minHeight: 90,
  },
} as const;

export type AdPlacementKey = keyof typeof AD_PLACEMENTS;

export function isAdSenseEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_ADSENSE_ENABLED === 'false') return false;
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim();
  return Boolean(client?.startsWith('ca-pub-'));
}

export function getAdSenseClientId(): string | null {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim();
  if (!client?.startsWith('ca-pub-')) return null;
  return client;
}

export function getAdSenseSlotId(placement: AdPlacementKey): string | null {
  const def = AD_PLACEMENTS[placement];
  const specific = process.env[def.slotEnv as keyof NodeJS.ProcessEnv]?.trim();
  if (specific) return specific;

  const fallback = process.env.NEXT_PUBLIC_ADSENSE_SLOT_DEFAULT?.trim();
  return fallback || null;
}

export function getAdsTxtPublisherLine(): string | null {
  const client = getAdSenseClientId();
  if (!client) return null;
  const pubId = client.replace('ca-pub-', 'pub-');
  return `google.com, ${pubId}, DIRECT, f08c47fec0942fa0`;
}
