/**
 * Seed Supabase via service role — run after migrations.
 * pnpm run supabase:seed
 */
import 'dotenv/config';
import { getSupabaseAdmin } from '../lib/supabase/admin';
import { ALL_AI_TOOLS } from '../modules/ai-tools/registry';
import { ContentStatus, ContentType } from '../lib/supabase/enums';

async function main() {
  const sb = getSupabaseAdmin();

  const programId = crypto.randomUUID();
  await sb.from('affiliate_programs').upsert({
    id: programId,
    slug: 'demo-network',
    name: 'Demo Affiliate Network',
    network: 'demo',
  });

  for (const slot of ['tool-top', 'tool-middle', 'tool-result', 'tool-footer']) {
    await sb.from('ad_placements').upsert({
      id: slot,
      slot_key: slot,
      provider: 'placeholder',
      config: { provider: 'placeholder', slotId: slot },
    });
  }

  for (const tool of ALL_AI_TOOLS) {
    const id = crypto.randomUUID();
    await sb.from('contents').upsert(
      {
        id,
        type: ContentType.AI_TOOL,
        slug: tool.slug,
        title: tool.name,
        excerpt: tool.description,
        status: tool.implemented ? ContentStatus.PUBLISHED : ContentStatus.DRAFT,
        published_at: tool.implemented ? new Date().toISOString() : null,
        seo_title: `${tool.name} — Free AI Tool`,
        seo_description: tool.description,
        keywords: [tool.category, 'ai tool'],
        metadata: {
          toolKey: tool.toolKey,
          category: tool.category,
          seo: tool.seo,
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'type,slug' },
    );
  }

  console.log(`Seeded ${ALL_AI_TOOLS.length} tools to Supabase`);
}

main().catch(console.error);
