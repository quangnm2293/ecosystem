import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const SNAPSHOT_BUCKET = 'tiktok-snapshots';

export type SaveSnapshotInput = {
  jobId: string;
  source: string;
  html?: string;
  meta?: Record<string, unknown>;
};

export type SaveSnapshotResult = {
  storageUrl: string;
  sizeBytes: number;
  uploaded: boolean;
};

/**
 * Prefer Supabase Storage; fall back to inline:// JSON if bucket missing.
 */
export async function saveCrawlSnapshot(input: SaveSnapshotInput): Promise<SaveSnapshotResult> {
  const payload = input.html ?? JSON.stringify(input.meta ?? {});
  const sizeBytes = new TextEncoder().encode(payload).length;
  const day = new Date().toISOString().slice(0, 10);
  const path = `${day}/${input.jobId}-${Date.now()}.html`;

  if (input.html) {
    try {
      const sb = getSupabaseAdmin();
      const { error } = await sb.storage.from(SNAPSHOT_BUCKET).upload(path, input.html, {
        contentType: 'text/html; charset=utf-8',
        upsert: false,
      });

      if (!error) {
        return {
          storageUrl: `storage://${SNAPSHOT_BUCKET}/${path}`,
          sizeBytes,
          uploaded: true,
        };
      }
    } catch {
      /* fall through */
    }
  }

  const inline = `inline://${input.jobId}`;
  return {
    storageUrl: inline,
    sizeBytes: Math.min(sizeBytes, 50_000),
    uploaded: false,
  };
}
