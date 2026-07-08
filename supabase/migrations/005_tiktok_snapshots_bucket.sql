-- Epic 31 C3 — private Storage bucket for crawl HTML snapshots

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tiktok-snapshots',
  'tiktok-snapshots',
  false,
  2097152,
  ARRAY['text/html', 'text/plain', 'application/json']
)
ON CONFLICT (id) DO NOTHING;

-- Service role full access (API worker uploads via service key)
DROP POLICY IF EXISTS "Service role tiktok snapshots" ON storage.objects;
CREATE POLICY "Service role tiktok snapshots"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'tiktok-snapshots')
  WITH CHECK (bucket_id = 'tiktok-snapshots');
