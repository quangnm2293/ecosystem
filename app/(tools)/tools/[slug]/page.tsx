import { notFound } from 'next/navigation';
import { ContentType } from '@/lib/supabase/enums';
import { getPublishedContent } from '@/lib/content/service';
import { buildMetadata, buildSoftwareAppJsonLd } from '@/lib/seo/metadata';
import { JsonLdScript } from '@/lib/seo/json-ld';
import { getContentPath } from '@/lib/routing/paths';
import { getToolBySlug } from '@/modules/ai-tools/registry';
import { AiToolPage } from '@/modules/ai-tools/components/AiToolPage';

export const revalidate = 86400;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const tool = getToolBySlug(slug);
  const content =
    (await getPublishedContent(ContentType.AI_TOOL, slug).catch(() => null)) ??
    (await getPublishedContent(ContentType.DEV_TOOL, slug).catch(() => null));

  const title = content?.seoTitle ?? tool?.name ?? slug;
  const description = content?.seoDescription ?? tool?.description ?? content?.excerpt;

  if (!tool && !content) return {};

  return buildMetadata({
    title,
    description: description ?? undefined,
    path: `/tools/${slug}`,
    ogImage: content?.ogImage ?? undefined,
  });
}

export default async function ToolDetailPage({ params }: Props) {
  const { slug } = await params;
  const tool = getToolBySlug(slug);
  const content = await getPublishedContent(ContentType.AI_TOOL, slug).catch(() => null);

  if (!tool) {
    if (!content) notFound();
    // Dev tool fallback — generic content shell có thể thêm sau
    notFound();
  }

  return (
    <>
      <JsonLdScript
        data={buildSoftwareAppJsonLd({
          name: tool.name,
          description: tool.description,
          path: getContentPath(ContentType.AI_TOOL, tool.slug),
        })}
      />
      <AiToolPage tool={tool} contentId={content?.id} />
    </>
  );
}
