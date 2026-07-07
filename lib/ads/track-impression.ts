'use client';

import type { AdPlacementKey } from '@/lib/ads/config';

function getVisitorId(): string {
  const key = 'ep_visitor_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

function getSessionId(): string {
  const key = 'ep_session_id';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

export async function trackAdImpression(placement: AdPlacementKey, path: string) {
  try {
    await fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        events: [
          {
            event_type: 'ad_impression',
            session_id: getSessionId(),
            visitor_id: getVisitorId(),
            ad_placement_id: placement,
            path,
            metadata: { placement },
          },
        ],
      }),
      keepalive: true,
    });
  } catch {
    /* optional analytics */
  }
}
