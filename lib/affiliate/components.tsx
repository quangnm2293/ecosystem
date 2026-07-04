import Link from 'next/link';
import { affiliateRedirectUrl } from '@/lib/affiliate/service';

type AffiliateButtonProps = {
  trackingId: string;
  label: string;
  className?: string;
};

export function AffiliateButton({ trackingId, label, className }: AffiliateButtonProps) {
  return (
    <Link
      href={affiliateRedirectUrl(trackingId)}
      rel="sponsored noopener noreferrer"
      target="_blank"
      className={className ?? 'ui-btn-accent'}
    >
      {label}
    </Link>
  );
}
