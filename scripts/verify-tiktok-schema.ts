/**
 * Run scripts/verify-tiktok-schema.sql checks with pass/fail summary.
 * Requires DATABASE_URL (Supabase → Settings → Database → URI, port 5432).
 *
 *   pnpm run supabase:verify-tiktok
 */
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import postgres from 'postgres';
import { diagnoseDatabaseUrl, printDatabaseUrlHints } from './lib/database-url';

const EXPECTED_TABLES = [
  'alerts',
  'categories',
  'crawl_jobs',
  'crawl_snapshots',
  'notification_logs',
  'product_metrics_current',
  'products',
  'shops',
  'subscriptions',
  'trend_ranking_items',
  'trend_rankings',
  'watchlist_items',
  'watchlists',
];

const EXPECTED_ENUMS = [
  'tiktok_alert_status',
  'tiktok_crawl_status',
  'tiktok_notification_status',
  'tiktok_product_status',
  'tiktok_subscription_status',
  'tiktok_subscription_tier',
];

const EXPECTED_CATEGORY_SLUGS = [
  'beauty',
  'electronics',
  'fashion',
  'food',
  'home',
  'mother-baby',
  'sports',
];

function pass(label: string, detail?: string) {
  console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ''}`);
}

function fail(label: string, detail?: string) {
  console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.error(
      'Missing DATABASE_URL. Add to .env from Supabase Dashboard → Settings → Database → Connection string (URI).',
    );
    process.exit(1);
  }

  const urlHints = diagnoseDatabaseUrl(databaseUrl);
  if (urlHints.length > 0) {
    printDatabaseUrlHints(databaseUrl);
    process.exit(1);
  }

  const sql = postgres(databaseUrl, { max: 1, prepare: false });
  let failed = 0;

  try {
    console.log('\n=== TikTok schema verification ===\n');

    // 1. Schema
    const schemas = await sql<{ schema_name: string }[]>`
      SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'tiktok'
    `;
    if (schemas.length === 1) pass('Schema tiktok exists');
    else {
      fail('Schema tiktok exists');
      failed++;
    }

    // 2. Tables
    const tables = await sql<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'tiktok' ORDER BY table_name
    `;
    const tableNames = tables.map((t) => t.table_name);
    const missingTables = EXPECTED_TABLES.filter((t) => !tableNames.includes(t));
    if (missingTables.length === 0) pass(`Tables (${tableNames.length}/13)`, tableNames.join(', '));
    else {
      fail(`Tables — missing: ${missingTables.join(', ')}`);
      failed++;
    }

    // 3. Enums
    const enums = await sql<{ typname: string }[]>`
      SELECT typname FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' AND typname LIKE 'tiktok_%'
      ORDER BY typname
    `;
    const enumNames = enums.map((e) => e.typname);
    const missingEnums = EXPECTED_ENUMS.filter((e) => !enumNames.includes(e));
    if (missingEnums.length === 0) pass(`Enums (${enumNames.length})`, enumNames.join(', '));
    else {
      fail(`Enums — missing: ${missingEnums.join(', ')}`);
      failed++;
    }

    // 4. Seed categories
    const categories = await sql<{ slug: string; name: string; region: string }[]>`
      SELECT slug, name, region FROM tiktok.categories
      WHERE region = 'VN' ORDER BY slug
    `;
    const slugs = categories.map((c) => c.slug);
    const missingSlugs = EXPECTED_CATEGORY_SLUGS.filter((s) => !slugs.includes(s));
    if (categories.length === 7 && missingSlugs.length === 0) {
      pass('VN categories (7/7)');
    } else {
      fail(`VN categories — got ${categories.length}, missing slugs: ${missingSlugs.join(', ') || 'none'}`);
      failed++;
    }

    // 5. FK to users
    const fks = await sql<{ table_name: string }[]>`
      SELECT tc.table_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'tiktok' AND ccu.table_name = 'users'
      ORDER BY tc.table_name
    `;
    if (fks.length >= 4) pass(`FK → public.users (${fks.length} tables)`, fks.map((f) => f.table_name).join(', '));
    else {
      fail(`FK → public.users — expected ≥4, got ${fks.length}`);
      failed++;
    }

    // 6. Partial indexes on trend_rankings
    const indexes = await sql<{ indexname: string }[]>`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = 'tiktok' AND tablename = 'trend_rankings' ORDER BY indexname
    `;
    const hasPartial = indexes.some((i) => i.indexname.includes('date_region'));
    if (hasPartial) pass('trend_rankings partial indexes', indexes.map((i) => i.indexname).join(', '));
    else {
      fail('trend_rankings partial indexes missing');
      failed++;
    }

    // 7. Smoke test (transaction rollback)
    const smokeFile = path.join(process.cwd(), 'scripts/verify-tiktok-schema.sql');
    const smokeSql = await readFile(smokeFile, 'utf8');
    const smokeBlock = smokeSql.match(/BEGIN;[\s\S]*ROLLBACK;/);
    if (!smokeBlock) throw new Error('Could not parse smoke test block from verify-tiktok-schema.sql');

    const smokeRows = await sql.unsafe(smokeBlock[0]);
    const lastSelect = Array.isArray(smokeRows) ? smokeRows.at(-1) : smokeRows;
    const row = Array.isArray(lastSelect) ? lastSelect[0] : null;
    if (row && row.title === 'Verify Product' && Number(row.rank) === 1) {
      pass('Smoke insert/join/rollback', `title=${row.title}, rank=${row.rank}, score=${row.opportunity_score}`);
    } else {
      fail('Smoke insert/join/rollback', JSON.stringify(row));
      failed++;
    }

    console.log(`\n=== Result: ${failed === 0 ? 'PASS' : `FAIL (${failed} check(s))`} ===\n`);
    process.exit(failed > 0 ? 1 : 0);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : '';
  if (code === '28P01') {
    console.error('PostgresError: password authentication failed for user "postgres".');
    if (process.env.DATABASE_URL) printDatabaseUrlHints(process.env.DATABASE_URL);
  } else {
    console.error(err);
  }
  process.exit(1);
});
