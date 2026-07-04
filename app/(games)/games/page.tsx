import Link from 'next/link';
import { ContentType } from '@/lib/supabase/enums';
import { listPublishedContent } from '@/lib/content/service';
import { buildMetadata } from '@/lib/seo/metadata';
import { getContentPath } from '@/lib/routing/paths';

export const revalidate = 86400;

export const metadata = buildMetadata({
  title: 'Games',
  description: 'HTML5 games miễn phí.',
  path: '/games',
});

export default async function GamesIndexPage() {
  let games: Awaited<ReturnType<typeof listPublishedContent>> = [];
  try {
    games = await listPublishedContent(ContentType.GAME, { limit: 50 });
  } catch {
    /* no DB */
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <span className="ui-badge">Games</span>
      <h1 className="ui-page-title mt-2">HTML5 Games</h1>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {games.map((g) => (
          <li key={g.id}>
            <Link href={getContentPath(g.type, g.slug)} className="ui-link-card font-semibold text-foreground">
              {g.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
