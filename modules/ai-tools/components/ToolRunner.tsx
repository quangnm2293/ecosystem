'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { AiToolPublic } from '@/modules/ai-tools/types';
import { DynamicForm } from '@/modules/ai-tools/components/DynamicForm';
import { AdPlaceholder } from '@/modules/ai-tools/components/AdPlaceholder';
import { affiliateRedirectUrl } from '@/lib/affiliate/service';

type ToolRunnerProps = {
  tool: AiToolPublic;
  contentId?: string;
};

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

async function trackEvent(payload: Record<string, unknown>) {
  await fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ events: [payload] }),
    keepalive: true,
  });
}

export function ToolRunner({ tool, contentId }: ToolRunnerProps) {
  const initialValues = useMemo(() => {
    const v: Record<string, string> = {};
    for (const f of tool.inputFields) {
      if (f.defaultValue) v[f.name] = f.defaultValue;
    }
    return v;
  }, [tool.inputFields]);

  const [values, setValues] = useState(initialValues);
  const [output, setOutput] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const mountedAt = useRef(Date.now());

  useEffect(() => {
    trackEvent({
      event_type: 'page_view',
      session_id: getSessionId(),
      visitor_id: getVisitorId(),
      content_id: contentId,
      path: `/tools/${tool.slug}`,
    });

    return () => {
      const durationSec = Math.round((Date.now() - mountedAt.current) / 1000);
      if (durationSec > 2) {
        void trackEvent({
          event_type: 'scroll_depth',
          session_id: getSessionId(),
          visitor_id: getVisitorId(),
          content_id: contentId,
          path: `/tools/${tool.slug}`,
          metadata: { time_on_tool_sec: durationSec },
        });
      }
    };
  }, [tool.slug, contentId]);

  const onChange = useCallback((name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const onGenerate = async () => {
    if (!tool.implemented) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolKey: tool.toolKey,
          input: values,
          sessionId: getSessionId(),
          visitorId: getVisitorId(),
          contentId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Generate failed');

      setOutput(data.output);
      setCached(data.cached);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const onCopy = async () => {
    if (output) await navigator.clipboard.writeText(output);
  };

  if (!tool.implemented) {
    return (
      <div className="ui-card-muted p-8 text-center">
        <p className="text-muted-foreground">Tool đang được phát triển. Quay lại sớm nhé!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdPlaceholder slotKey="tool-top" />

      <div className="ui-card p-6">
        <DynamicForm fields={tool.inputFields} values={values} onChange={onChange} disabled={loading} />

        <button
          type="button"
          onClick={onGenerate}
          disabled={loading}
          className="ui-btn-primary mt-6 w-full sm:w-auto"
        >
          {loading ? 'Đang generate…' : 'Generate'}
        </button>

        {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      </div>

      <AdPlaceholder slotKey="tool-middle" />

      {output && (
        <div className="ui-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border-muted bg-surface-muted px-6 py-3">
            <span className="text-sm font-medium text-foreground">
              Kết quả {cached && <span className="text-muted">(cached)</span>}
            </span>
            <button type="button" onClick={onCopy} className="ui-btn-ghost">
              Copy
            </button>
          </div>
          <div className="max-h-120 overflow-auto p-6">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
              {output}
            </pre>
          </div>

          <AdPlaceholder slotKey="tool-result" className="mx-6 mb-6" />

          {tool.affiliateTrackingId && (
            <div className="border-t border-border-muted bg-surface-muted px-6 py-5">
              <p className="text-sm text-muted-foreground">
                {tool.affiliateCtaDescription ?? 'Nâng cấp workflow với công cụ premium.'}
              </p>
              <Link
                href={`${affiliateRedirectUrl(tool.affiliateTrackingId)}?sid=${getSessionId()}&vid=${getVisitorId()}&from=/tools/${tool.slug}`}
                rel="sponsored noopener noreferrer"
                target="_blank"
                className="ui-btn-accent mt-3"
              >
                {tool.affiliateCtaLabel}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
