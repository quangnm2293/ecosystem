import { getAdSenseClientId, isAdSenseEnabled } from '@/lib/ads/config';

/** Google AdSense — đặt trong <head> theo hướng dẫn AdSense. */
export function AdSenseHeadScript() {
  const clientId = getAdSenseClientId();
  if (!isAdSenseEnabled() || !clientId) return null;

  return (
    <script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
      crossOrigin="anonymous"
    />
  );
}
