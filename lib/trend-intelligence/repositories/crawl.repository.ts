import { mapCrawlJob } from '@/lib/trend-intelligence/domain/mappers';
import { TiktokCrawlStatus } from '@/lib/trend-intelligence/domain/enums';
import type { CrawlJob, CrawlJobRow } from '@/lib/trend-intelligence/domain/types';
import { getTiktokDb } from '@/lib/trend-intelligence/repositories/tiktok-db';

export type EnqueueCrawlInput = {
  source: string;
  params?: Record<string, unknown>;
  scheduledAt?: Date;
};

export const crawlRepository = {
  async enqueue(input: EnqueueCrawlInput): Promise<CrawlJob> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const { data, error } = await getTiktokDb()
      .from('crawl_jobs')
      .insert({
        id,
        source: input.source,
        params: input.params ?? {},
        status: TiktokCrawlStatus.PENDING,
        scheduled_at: (input.scheduledAt ?? new Date()).toISOString(),
        created_at: now,
      })
      .select('*')
      .single();

    if (error) throw error;
    return mapCrawlJob(data as CrawlJobRow);
  },

  async claimNext(): Promise<CrawlJob | null> {
    const { data: pending, error: findError } = await getTiktokDb()
      .from('crawl_jobs')
      .select('*')
      .eq('status', TiktokCrawlStatus.PENDING)
      .lte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (findError) throw findError;
    if (!pending) return null;

    const startedAt = new Date().toISOString();
    const { data: claimed, error: claimError } = await getTiktokDb()
      .from('crawl_jobs')
      .update({
        status: TiktokCrawlStatus.RUNNING,
        started_at: startedAt,
        attempts: (pending as CrawlJobRow).attempts + 1,
      })
      .eq('id', (pending as CrawlJobRow).id)
      .eq('status', TiktokCrawlStatus.PENDING)
      .select('*')
      .maybeSingle();

    if (claimError) throw claimError;
    return claimed ? mapCrawlJob(claimed as CrawlJobRow) : null;
  },

  async markCompleted(id: string): Promise<void> {
    const { error } = await getTiktokDb()
      .from('crawl_jobs')
      .update({
        status: TiktokCrawlStatus.COMPLETED,
        completed_at: new Date().toISOString(),
        error_message: null,
      })
      .eq('id', id);

    if (error) throw error;
  },

  async markFailed(id: string, message: string, job: CrawlJob): Promise<void> {
    const shouldRetry = job.attempts < job.maxAttempts;
    const patch: Record<string, unknown> = {
      status: shouldRetry ? TiktokCrawlStatus.PENDING : TiktokCrawlStatus.FAILED,
      error_message: message.slice(0, 2000),
    };

    if (shouldRetry) {
      patch.scheduled_at = new Date(Date.now() + job.attempts * 60_000).toISOString();
      patch.started_at = null;
    } else {
      patch.completed_at = new Date().toISOString();
    }

    const { error } = await getTiktokDb().from('crawl_jobs').update(patch).eq('id', id);
    if (error) throw error;
  },

  async saveSnapshot(input: {
    jobId: string;
    source: string;
    storageUrl: string;
    sizeBytes?: number;
  }): Promise<void> {
    const { error } = await getTiktokDb().from('crawl_snapshots').insert({
      id: crypto.randomUUID(),
      job_id: input.jobId,
      source: input.source,
      storage_url: input.storageUrl,
      size_bytes: input.sizeBytes ?? null,
      parsed: true,
      created_at: new Date().toISOString(),
    });

    if (error) throw error;
  },
};
