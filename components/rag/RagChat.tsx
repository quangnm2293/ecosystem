'use client';

import { useState } from 'react';
import type { RagQueryResponse } from '@/lib/rag/types';

type RagChatProps = {
  placeholder?: string;
  contentTypes?: string[];
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

/** Ecosystem AI assistant — powers chat, tool helper, blog/compare Q&A */
export function RagChat({ placeholder = 'Hỏi về tools, blog, so sánh sản phẩm…', contentTypes }: RagChatProps) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RagQueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.trim(),
          filters: contentTypes?.length ? { contentTypes } : undefined,
          visitorId: getVisitorId(),
          sessionId: getSessionId(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Query failed');
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ui-card overflow-hidden">
      <form onSubmit={onSubmit} className="flex gap-2 border-b border-border-muted bg-surface-muted p-4">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={placeholder}
          className="ui-input flex-1"
          maxLength={500}
        />
        <button type="submit" disabled={loading} className="ui-btn-primary shrink-0">
          {loading ? '…' : 'Hỏi'}
        </button>
      </form>

      {error && <p className="p-4 text-sm text-danger">{error}</p>}

      {result && (
        <div className="space-y-4 p-4">
          <div className="max-w-none text-sm text-foreground">
            <p className="whitespace-pre-wrap">{result.answer}</p>
          </div>
          {result.sources.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase text-muted">Nguồn</p>
              <ul className="mt-2 space-y-1">
                {result.sources.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} className="text-sm text-primary hover:underline">
                      {s.title}
                    </a>
                    <span className="ml-2 text-xs text-muted">({s.contentType})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-muted">
            {result.cached ? 'Cached · ' : ''}
            Retrieval {result.retrievalMs}ms · {result.model}
          </p>
        </div>
      )}
    </div>
  );
}
