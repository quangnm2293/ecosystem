import Link from 'next/link';
import { ContentType } from '@/lib/supabase/enums';
import { listPublishedContent } from '@/lib/content/service';
import { buildMetadata } from '@/lib/seo/metadata';
import { getContentPath } from '@/lib/routing/paths';
import { ALL_AI_TOOLS, getImplementedTools } from '@/modules/ai-tools/registry';
import { RagChat } from '@/components/rag/RagChat';
import type { AiToolDefinition } from '@/modules/ai-tools/types';

export const revalidate = 3600;

export const metadata = buildMetadata({
  title: 'AI Tools',
  description: 'Công cụ AI miễn phí: blog writer, TikTok script, image prompt và nhiều hơn.',
  path: '/tools',
});

export default async function ToolsIndexPage() {
  let dbTools: Awaited<ReturnType<typeof listPublishedContent>> = [];
  try {
    dbTools = await listPublishedContent([ContentType.AI_TOOL, ContentType.DEV_TOOL], { limit: 50 });
  } catch {
    /* registry fallback */
  }

  const registryTools = ALL_AI_TOOLS;
  const implemented = getImplementedTools().length;

  const byCategory = registryTools.reduce<Record<string, AiToolDefinition[]>>((acc, t) => {
    (acc[t.category] ??= []).push(t);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <span className="ui-badge">AI Tools</span>
      <h1 className="ui-page-title mt-2">Công cụ AI miễn phí</h1>
      <p className="mt-2 text-muted-foreground">
        {implemented} công cụ sẵn sàng · Miễn phí · SEO-optimized
      </p>

      <Link href="/tools/tiktok-shop" className="ui-link-card mt-6 block border-primary/30 bg-primary/5">
        <span className="font-semibold text-primary">TikTok Shop Analytics (FastMoss-like)</span>
        <p className="mt-1 text-sm text-muted-foreground">
          9 công cụ phân tích: sản phẩm bán chạy, KOL, livestream, quảng cáo, VOC…
        </p>
      </Link>

      {Object.entries(byCategory).map(([category, tools]) => (
        <section key={category} className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">{category}</h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {tools.map((tool) => {
              const db = dbTools.find((d) => d.slug === tool.slug);
              return (
                <li key={tool.toolKey}>
                  <Link href={`/tools/${tool.slug}`} className="ui-link-card group h-full">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {tool.name}
                      </span>
                      {!tool.implemented && (
                        <span className="ui-badge shrink-0">
                          Soon
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{tool.description}</p>
                    {db && (
                      <p className="mt-3 text-xs text-muted">{getContentPath(db.type, db.slug)}</p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <div className="mt-12">
        <h2 className="ui-section-title">AI Assistant</h2>
        <p className="mt-1 text-sm text-muted-foreground">Hỏi đáp dựa trên nội dung nền tảng (RAG)</p>
        <div className="mt-4">
          <RagChat contentTypes={['AI_TOOL', 'DEV_TOOL']} />
        </div>
      </div>
    </div>
  );
}
