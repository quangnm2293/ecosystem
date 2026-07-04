import type { ContentType } from '@/lib/supabase/enums';
import { ContentType as CT } from '@/lib/supabase/enums';

export type VerticalConfig = {
  type: ContentType | ContentType[];
  label: string;
  basePath: string;
  defaultRevalidate: number;
  listingRevalidate: number;
};

export const VERTICALS: VerticalConfig[] = [
  {
    type: CT.BLOG,
    label: 'Blog',
    basePath: '/blog',
    defaultRevalidate: 3600,
    listingRevalidate: 1800,
  },
  {
    type: [CT.AI_TOOL, CT.DEV_TOOL],
    label: 'Tools',
    basePath: '/tools',
    defaultRevalidate: 86400,
    listingRevalidate: 3600,
  },
  {
    type: CT.COMPARE,
    label: 'Compare',
    basePath: '/compare',
    defaultRevalidate: 86400,
    listingRevalidate: 3600,
  },
  {
    type: CT.GAME,
    label: 'Games',
    basePath: '/games',
    defaultRevalidate: 604800,
    listingRevalidate: 86400,
  },
];

export function getVerticalByPath(pathname: string): VerticalConfig | undefined {
  return VERTICALS.find((v) => pathname.startsWith(v.basePath));
}
