'use client';

type AdPlaceholderProps = {
  slotKey: string;
  className?: string;
};

/** Client-safe ad slot — production: swap với AdSense script */
export function AdPlaceholder({ slotKey, className }: AdPlaceholderProps) {
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_ADSENSE_CLIENT) {
    return (
      <div className={className} data-ad-slot={slotKey}>
        <ins
          className="adsbygoogle block min-h-[90px] w-full"
          data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_CLIENT}
          data-ad-slot={slotKey}
        />
      </div>
    );
  }

  return (
    <div
      className={`flex min-h-[90px] items-center justify-center rounded-lg border border-dashed border-border bg-surface-muted/80 text-xs text-muted ${className ?? ''}`}
      data-ad-slot={slotKey}
    >
      Ad · {slotKey}
    </div>
  );
}
