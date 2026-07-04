type AdSlotProps = {
  slotKey: string;
  className?: string;
};

export function AdSlot({ slotKey, className }: AdSlotProps) {
  if (process.env.NEXT_PUBLIC_ADSENSE_CLIENT) {
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
    <div className={className}>
      <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border bg-surface-muted text-sm text-muted">
        Ad · {slotKey}
      </div>
    </div>
  );
}
