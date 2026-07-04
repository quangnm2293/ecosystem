import { notFound } from 'next/navigation';
import { ContentType } from '@/lib/supabase/enums';
import { getPublishedContent } from '@/lib/content/service';
import { buildMetadata } from '@/lib/seo/metadata';
import { GameMetadataSchema } from '@/lib/content/types';
import { getContentPath } from '@/lib/routing/paths';

export const revalidate = 604800;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const content = await getPublishedContent(ContentType.GAME, slug);
  if (!content) return {};

  return buildMetadata({
    title: content.seoTitle ?? content.title,
    description: content.seoDescription ?? content.excerpt ?? undefined,
    path: getContentPath(content.type, content.slug),
  });
}

export default async function GameDetailPage({ params }: Props) {
  const { slug } = await params;
  const content = await getPublishedContent(ContentType.GAME, slug);
  if (!content) notFound();

  const meta = GameMetadataSchema.safeParse(content.metadata).data;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="ui-page-title">{content.title}</h1>
      {meta?.embedUrl ? (
        <iframe
          src={meta.embedUrl}
          title={content.title}
          width={meta.width}
          height={meta.height}
          className="mt-8 w-full rounded-xl border border-border"
        />
      ) : (
        <p className="mt-8 text-muted-foreground">
          Game module: implement HTML5 canvas tại modules/games/
        </p>
      )}
    </div>
  );
}
