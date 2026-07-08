/**
 * Apply SQL migrations to Supabase PostgreSQL.
 *
 * Requires DATABASE_URL (Supabase Dashboard → Settings → Database → Connection string → URI).
 * Use Transaction pooler (port 6543) for serverless; Session/Direct (5432) for migrations.
 *
 *   pnpm run supabase:migrate
 *   pnpm run supabase:migrate -- 003   # single file prefix
 */
import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import postgres from 'postgres';
import { diagnoseDatabaseUrl, printDatabaseUrlHints } from './lib/database-url';

const MIGRATIONS_DIR = path.join(process.cwd(), 'supabase/migrations');

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.error(
      'Missing DATABASE_URL. Copy from Supabase Dashboard → Settings → Database → Connection string (URI).',
    );
    process.exit(1);
  }

  if (diagnoseDatabaseUrl(databaseUrl).length > 0) {
    printDatabaseUrlHints(databaseUrl);
    process.exit(1);
  }

  const filterPrefix = process.argv.slice(2).find((a) => a !== '--')?.trim();
  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const toRun = filterPrefix ? files.filter((f) => f.startsWith(filterPrefix)) : files;
  if (toRun.length === 0) {
    console.error(filterPrefix ? `No migration matching prefix: ${filterPrefix}` : 'No migration files found.');
    process.exit(1);
  }

  const sql = postgres(databaseUrl, { max: 1, prepare: false });

  try {
    for (const file of toRun) {
      const filePath = path.join(MIGRATIONS_DIR, file);
      const body = await readFile(filePath, 'utf8');
      console.log(`→ ${file}`);
      await sql.unsafe(body);
      console.log(`  ✓ applied`);
    }
    console.log(`\nDone. ${toRun.length} migration(s) applied.`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
