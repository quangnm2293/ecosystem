/**
 * Validate all data/tiktok-seeds/vn-*.json against DB categories.
 *
 *   pnpm run tiktok:validate-seeds
 */
import 'dotenv/config';
import { listSeedCategorySlugs, loadSeedFile } from '@/lib/trend-intelligence/seeds/load-seeds';
import { categoryRepository } from '@/lib/trend-intelligence/repositories/category.repository';

const EXPECTED = [
  'beauty',
  'electronics',
  'fashion',
  'food',
  'home',
  'mother-baby',
  'sports',
] as const;

async function main() {
  const region = 'VN';
  const slugs = await listSeedCategorySlugs(region);
  const dbCats = await categoryRepository.listByRegion(region);
  const dbSlugs = new Set(dbCats.map((c) => c.slug));

  let failed = 0;
  console.log('\n=== TikTok seed validation ===\n');

  for (const slug of EXPECTED) {
    if (!slugs.includes(slug)) {
      console.log(`  ✗ missing file vn-${slug}.json`);
      failed++;
      continue;
    }
    if (!dbSlugs.has(slug)) {
      console.log(`  ✗ ${slug} — not in tiktok.categories`);
      failed++;
      continue;
    }
    try {
      const seed = await loadSeedFile(region, slug);
      const n = seed.products.length;
      const withTitle = seed.products.filter((p) => p.title).length;
      if (n < 8) {
        console.log(`  ✗ ${slug} — only ${n} products (want ≥8)`);
        failed++;
      } else {
        console.log(`  ✓ ${slug} — ${n} products (${withTitle} with title)`);
      }
    } catch (err) {
      console.log(`  ✗ ${slug} — ${err instanceof Error ? err.message : err}`);
      failed++;
    }
  }

  const extra = slugs.filter((s) => !EXPECTED.includes(s as (typeof EXPECTED)[number]));
  if (extra.length) console.log(`\n  (extra seeds: ${extra.join(', ')})`);

  console.log(`\n=== Result: ${failed === 0 ? 'PASS' : `FAIL (${failed})`} ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
