import { notFound } from 'next/navigation';
import { ContentType } from '@/lib/supabase/enums';
import { getPublishedContent } from '@/lib/content/service';
import { ContentPageShell } from '@/lib/content/page-shell';
import { buildMetadata } from '@/lib/seo/metadata';
import { getContentPath } from '@/lib/routing/paths';

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const content = await getPublishedContent(ContentType.BLOG, slug);
  if (!content) return {};

  return buildMetadata({
    title: content.seoTitle ?? content.title,
    description: content.seoDescription ?? content.excerpt ?? undefined,
    path: getContentPath(content.type, content.slug),
    canonicalUrl: content.canonicalUrl ?? undefined,
    ogImage: content.ogImage ?? undefined,
    type: 'article',
    publishedTime: content.publishedAt?.toISOString(),
    modifiedTime: content.updatedAt.toISOString(),
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const content = await getPublishedContent(ContentType.BLOG, slug);
  if (!content) notFound();

  return <ContentPageShell content={content} verticalLabel="Blog" />;
}
