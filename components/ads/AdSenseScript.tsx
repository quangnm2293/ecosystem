import { getAdSenseClientId, isAdSenseEnabled } from '@/lib/ads/config';

/** Google AdSense — script + meta trong <head> (verification crawler). */
export function AdSenseHeadScript() {
  if (!isAdSenseEnabled()) return null;

  const clientId = getAdSenseClientId()!;

  return (
    <>
      <meta name="google-adsense-account" content={clientId} />
      <script
        async
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
        crossOrigin="anonymous"
      />
    </>
  );
}
