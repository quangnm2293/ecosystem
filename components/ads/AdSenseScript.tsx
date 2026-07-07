import Script from 'next/script';
import { getAdSenseClientId, isAdSenseEnabled } from '@/lib/ads/config';

/** Load Google AdSense một lần — đặt trong root layout. */
export function AdSenseScript() {
  const clientId = getAdSenseClientId();
  if (!isAdSenseEnabled() || !clientId) return null;

  return (
    <Script
      id="adsense-script"
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
