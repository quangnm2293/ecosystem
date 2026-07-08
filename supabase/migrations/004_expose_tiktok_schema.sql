-- Epic 31 — Expose tiktok schema to PostgREST + grants
-- Run after 003_tiktok_trend_intelligence.sql

GRANT USAGE ON SCHEMA tiktok TO anon, authenticated, service_role;

GRANT SELECT ON ALL TABLES IN SCHEMA tiktok TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA tiktok TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA tiktok TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA tiktok
  GRANT SELECT ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA tiktok
  GRANT ALL ON TABLES TO service_role;

-- PostgREST: include tiktok in exposed schemas (idempotent join)
DO $$
DECLARE
  current_schemas text;
BEGIN
  current_schemas := coalesce(
    current_setting('pgrst.db_schemas', true),
    'public, graphql_public'
  );
  IF position('tiktok' in current_schemas) = 0 THEN
    EXECUTE format(
      'ALTER ROLE authenticator SET pgrst.db_schemas = %L',
      current_schemas || ', tiktok'
    );
  END IF;
EXCEPTION
  WHEN insufficient_privilege OR undefined_object THEN
    RAISE NOTICE 'Could not set pgrst.db_schemas — expose tiktok in Dashboard → API Settings';
END $$;

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
