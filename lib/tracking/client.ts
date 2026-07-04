'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { TrackEventInput } from '@/lib/analytics/schemas';

const FLUSH_INTERVAL_MS = 5000;
const MAX_BATCH = 20;

function getVisitorId(): string {
  if (typeof window === 'undefined') return '';
  const key = 'ep_visitor_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  const key = 'ep_session_id';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

type ClientTrackEvent = Omit<TrackEventInput, 'session_id' | 'visitor_id'> & {
  session_id?: string;
  visitor_id?: string;
};

async function flushEvents(events: TrackEventInput[]) {
  if (events.length === 0) return;
  await fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ events }),
    keepalive: true,
  });
}

export function useAnalytics() {
  const queue = useRef<TrackEventInput[]>([]);
  const sessionStarted = useRef(false);

  const track = useCallback((event: ClientTrackEvent) => {
    queue.current.push({
      ...event,
      session_id: event.session_id ?? getSessionId(),
      visitor_id: event.visitor_id ?? getVisitorId(),
      path: event.path ?? (typeof window !== 'undefined' ? window.location.pathname : undefined),
    });

    if (queue.current.length >= MAX_BATCH) {
      const batch = queue.current.splice(0, MAX_BATCH);
      void flushEvents(batch);
    }
  }, []);

  useEffect(() => {
    if (!sessionStarted.current) {
      sessionStarted.current = true;
      track({ event_type: 'session_start', metadata: { referrer: document.referrer || undefined } });
    }

    const interval = setInterval(() => {
      if (queue.current.length > 0) {
        void flushEvents(queue.current.splice(0, MAX_BATCH));
      }
    }, FLUSH_INTERVAL_MS);

    const onUnload = () => {
      if (queue.current.length > 0) void flushEvents([...queue.current]);
    };
    window.addEventListener('pagehide', onUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('pagehide', onUnload);
    };
  }, [track]);

  return { track };
}

export function PageViewTracker({ contentId }: { contentId?: string }) {
  const { track } = useAnalytics();

  useEffect(() => {
    track({ event_type: 'page_view', content_id: contentId });
  }, [track, contentId]);

  return null;
}

/** Scroll depth milestones: 25, 50, 75, 100 */
export function ScrollDepthTracker({ contentId }: { contentId?: string }) {
  const { track } = useAnalytics();
  const fired = useRef(new Set<number>());

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const depth = Math.round(((doc.scrollTop + doc.clientHeight) / doc.scrollHeight) * 100);
      for (const milestone of [25, 50, 75, 100]) {
        if (depth >= milestone && !fired.current.has(milestone)) {
          fired.current.add(milestone);
          track({ event_type: 'scroll_depth', content_id: contentId, metadata: { depth: milestone } });
        }
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [track, contentId]);

  return null;
}
