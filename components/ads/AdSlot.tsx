import { AdUnit } from '@/components/ads/AdUnit';
import type { AdPlacementKey } from '@/lib/ads/config';

type AdSlotProps = {
  /** @deprecated dùng `placement` — giữ tương thích */
  slotKey: AdPlacementKey;
  placement?: AdPlacementKey;
  className?: string;
};

/** Server-safe wrapper — render AdUnit client component. */
export function AdSlot({ slotKey, placement, className }: AdSlotProps) {
  return <AdUnit placement={placement ?? slotKey} className={className} />;
}
