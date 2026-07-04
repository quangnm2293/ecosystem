import type { ContentType } from '@/lib/supabase/enums';

/** URL prefix theo vertical — thêm vertical mới chỉ cần map ở đây */
export const VERTICAL_PATHS: Record<ContentType, string> = {
  BLOG: '/blog',
  AI_TOOL: '/tools',
  DEV_TOOL: '/tools',
  GAME: '/games',
  COMPARE: '/compare',
};

export function getContentPath(type: ContentType, slug: string): string {
  return `${VERTICAL_PATHS[type]}/${slug}`;
}

export function getVerticalBasePath(type: ContentType): string {
  return VERTICAL_PATHS[type];
}
