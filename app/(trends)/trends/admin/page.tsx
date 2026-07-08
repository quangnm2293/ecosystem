import { AdSlot } from '@/components/ads/AdSlot';
import { buildMetadata } from '@/lib/seo/metadata';
import { crawlRepository } from '@/lib/trend-intelligence/repositories/crawl.repository';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = buildMetadata({
  title: 'TikTok Crawl Admin',
  description: 'Queue status for TikTok VN crawl jobs',
  path: '/trends/admin',
  noIndex: true,
});

export default async function TrendsAdminPage() {
  let counts: Record<string, number> = {};
  let jobs: Awaited<ReturnType<typeof crawlRepository.listRecent>> = [];
  let error: string | null = null;

  try {
    counts = await crawlRepository.countByStatus();
    jobs = await crawlRepository.listRecent({ limit: 40 });
  } catch (err) {
    error = err instanceof Error ? err.message : 'Load failed';
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <span className="ui-badge">Admin · VN</span>
      <h1 className="ui-page-title mt-2">Crawl jobs</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Requeue / watchlist / alerts qua API internal (cần{' '}
        <code className="text-xs">CRAWL_WORKER_SECRET</code>).
      </p>

      <AdSlot slotKey="list-top" className="mt-6" />

      {error && (
        <p className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED'] as const).map((s) => (
          <div key={s} className="ui-card p-4">
            <dt className="text-xs text-muted-foreground">{s}</dt>
            <dd className="mt-1 text-2xl font-semibold">{counts[s] ?? 0}</dd>
          </div>
        ))}
      </dl>

      <ul className="mt-8 space-y-2">
        {jobs.map((j) => (
          <li key={j.id} className="ui-card p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs text-muted-foreground">{j.id.slice(0, 8)}…</span>
              <span
                className={
                  j.status === 'FAILED'
                    ? 'font-medium text-destructive'
                    : j.status === 'PENDING'
                      ? 'font-medium text-amber-600'
                      : 'font-medium text-foreground'
                }
              >
                {j.status}
              </span>
            </div>
            <p className="mt-1 font-medium">{j.source}</p>
            {j.errorMessage && (
              <p className="mt-1 line-clamp-2 text-xs text-destructive">{j.errorMessage}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              attempts {j.attempts}/{j.maxAttempts} · {j.createdAt.toISOString()}
            </p>
          </li>
        ))}
        {jobs.length === 0 && !error && (
          <p className="text-muted-foreground">Chưa có crawl jobs.</p>
        )}
      </ul>

      <pre className="mt-8 overflow-x-auto rounded-lg border border-border bg-muted/40 p-4 text-xs">
{`# Requeue failed job
curl -X POST /api/tiktok/internal/admin/jobs \\
  -H 'Content-Type: application/json' \\
  -d '{"secret":"...","action":"requeue","jobId":"..."}'

# Watchlist refresh
curl -X POST /api/tiktok/internal/admin/jobs \\
  -d '{"secret":"...","action":"watchlist-refresh"}'

# Evaluate alerts
curl -X POST /api/tiktok/internal/admin/jobs \\
  -d '{"secret":"...","action":"eval-alerts"}'`}
      </pre>
    </div>
  );
}
