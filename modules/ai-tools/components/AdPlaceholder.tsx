import { AdUnit } from '@/components/ads/AdUnit';
import type { AdPlacementKey } from '@/lib/ads/config';

type AdPlaceholderProps = {
  slotKey: AdPlacementKey;
  className?: string;
};

/** @deprecated Dùng AdUnit hoặc AdSlot — giữ prop slotKey cho ToolRunner. */
export function AdPlaceholder({ slotKey, className }: AdPlaceholderProps) {
  return <AdUnit placement={slotKey} className={className} />;
}
