import { PrismaClient, ContentType, ContentStatus } from '@prisma/client';
import { ALL_AI_TOOLS } from '../modules/ai-tools/registry';

const prisma = new PrismaClient();

async function main() {
  const program = await prisma.affiliateProgram.upsert({
    where: { slug: 'demo-network' },
    create: { slug: 'demo-network', name: 'Demo Affiliate Network', network: 'demo' },
    update: {},
  });

  const adSlots = ['tool-top', 'tool-middle', 'tool-result', 'tool-footer', 'content-top'];
  for (const slotKey of adSlots) {
    await prisma.adPlacement.upsert({
      where: { slotKey },
      create: { slotKey, provider: 'placeholder', config: { provider: 'placeholder', slotId: slotKey } },
      update: {},
    });
  }

  const contentIds: string[] = [];

  for (const tool of ALL_AI_TOOLS) {
    const { seo, inputFields, ...metaRest } = tool;
    const metadata = {
      toolKey: tool.toolKey,
      category: tool.category,
      categoryLabel: tool.categoryLabel,
      inputFields: tool.inputFields,
      outputFormat: tool.outputFormat,
      model: tool.model,
      temperature: tool.temperature,
      maxTokens: tool.maxTokens,
      affiliateTrackingId: tool.affiliateTrackingId,
      affiliateCtaLabel: tool.affiliateCtaLabel,
      affiliateCtaDescription: tool.affiliateCtaDescription,
      seo,
      relatedToolKeys: tool.relatedToolKeys,
    };

    const row = await prisma.content.upsert({
      where: { type_slug: { type: ContentType.AI_TOOL, slug: tool.slug } },
      create: {
        type: ContentType.AI_TOOL,
        slug: tool.slug,
        title: tool.name,
        excerpt: tool.description,
        status: tool.implemented ? ContentStatus.PUBLISHED : ContentStatus.DRAFT,
        publishedAt: tool.implemented ? new Date() : undefined,
        seoTitle: `${tool.name} — Free AI Tool`,
        seoDescription: tool.description,
        focusKeyword: tool.name.toLowerCase(),
        keywords: [tool.category, 'ai tool', 'free'],
        indexStatus: tool.implemented ? 'INDEXED' : 'PENDING',
        sitemapPriority: tool.implemented ? 0.8 : 0.3,
        metadata,
      },
      update: {
        title: tool.name,
        excerpt: tool.description,
        metadata,
      },
    });
    contentIds.push(row.id);

    if (tool.affiliateTrackingId) {
      await prisma.affiliateLink.upsert({
        where: { trackingId: tool.affiliateTrackingId },
        create: {
          programId: program.id,
          contentId: row.id,
          label: tool.affiliateCtaLabel ?? 'Premium AI',
          destination: 'https://example.com/premium-ai',
          trackingId: tool.affiliateTrackingId,
        },
        update: { contentId: row.id },
      });
    }
  }

  // Internal links between related tools
  for (const tool of ALL_AI_TOOLS) {
    const source = await prisma.content.findUnique({
      where: { type_slug: { type: ContentType.AI_TOOL, slug: tool.slug } },
    });
    if (!source) continue;

    for (const relatedKey of tool.relatedToolKeys) {
      const related = ALL_AI_TOOLS.find((t) => t.toolKey === relatedKey);
      if (!related) continue;
      const target = await prisma.content.findUnique({
        where: { type_slug: { type: ContentType.AI_TOOL, slug: related.slug } },
      });
      if (!target) continue;

      await prisma.contentLink.upsert({
        where: {
          sourceId_targetId_relation: {
            sourceId: source.id,
            targetId: target.id,
            relation: 'RELATED',
          },
        },
        create: {
          sourceId: source.id,
          targetId: target.id,
          relation: 'RELATED',
          anchorText: related.name,
          weight: 5,
        },
        update: {},
      });
    }
  }

  console.log(`Seeded ${ALL_AI_TOOLS.length} AI tools`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
