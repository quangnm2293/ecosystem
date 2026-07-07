'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import {
  AD_PLACEMENTS,
  getAdSenseClientId,
  getAdSenseSlotId,
  isAdSenseEnabled,
  type AdPlacementKey,
} from '@/lib/ads/config';
import { trackAdImpression } from '@/lib/ads/track-impression';
import { cn } from '@/lib/utils';

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

type AdUnitProps = {
  placement: AdPlacementKey;
  className?: string;
};

export function AdUnit({ placement, className }: AdUnitProps) {
  const ref = useRef<HTMLDivElement>(null);
  const pushed = useRef(false);
  const pathname = usePathname() ?? '/';

  const meta = AD_PLACEMENTS[placement];
  const enabled = isAdSenseEnabled();
  const clientId = getAdSenseClientId();
  const slotId = getAdSenseSlotId(placement);
  const showAd = enabled && Boolean(clientId && slotId);

  useEffect(() => {
    if (!showAd || pushed.current) return;

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || pushed.current) return;
        pushed.current = true;
        try {
          window.adsbygoogle = window.adsbygoogle || [];
          window.adsbygoogle.push({});
        } catch {
          /* adblock / script not loaded */
        }
        void trackAdImpression(placement, pathname);
        observer.disconnect();
      },
      { rootMargin: '120px', threshold: 0.01 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [showAd, placement, pathname]);

  if (!showAd) {
    return (
      <div
        ref={ref}
        className={cn('ad-unit ad-unit--placeholder', className)}
        data-ad-placement={placement}
      >
        <p className="mb-1 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Quảng cáo
        </p>
        <div
          className="flex items-center justify-center rounded-lg border border-dashed border-border bg-surface-muted/80 text-xs text-muted-foreground"
          style={{ minHeight: meta.minHeight }}
        >
          {meta.label}
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className={cn('ad-unit overflow-hidden', className)} data-ad-placement={placement}>
      <p className="mb-1 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80">
        Quảng cáo
      </p>
      <ins
        className="adsbygoogle block w-full"
        style={{ display: 'block', minHeight: meta.minHeight }}
        data-ad-client={clientId!}
        data-ad-slot={slotId!}
        data-ad-format={meta.format}
        {...(meta.responsive ? { 'data-full-width-responsive': 'true' } : {})}
      />
    </div>
  );
}
