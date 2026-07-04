import { notFound } from 'next/navigation';
import { ContentType } from '@/lib/supabase/enums';
import { getPublishedContent } from '@/lib/content/service';
import { ContentPageShell } from '@/lib/content/page-shell';
import { buildMetadata } from '@/lib/seo/metadata';
import { getContentPath } from '@/lib/routing/paths';

export const revalidate = 86400;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const content = await getPublishedContent(ContentType.COMPARE, slug);
  if (!content) return {};

  return buildMetadata({
    title: content.seoTitle ?? content.title,
    description: content.seoDescription ?? content.excerpt ?? undefined,
    path: getContentPath(content.type, content.slug),
  });
}

export default async function CompareDetailPage({ params }: Props) {
  const { slug } = await params;
  const content = await getPublishedContent(ContentType.COMPARE, slug);
  if (!content) notFound();

  return <ContentPageShell content={content} verticalLabel="Compare" />;
}
