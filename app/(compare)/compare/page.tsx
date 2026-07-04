import Link from 'next/link';
import { ContentType } from '@/lib/supabase/enums';
import { listPublishedContent } from '@/lib/content/service';
import { buildMetadata } from '@/lib/seo/metadata';
import { getContentPath } from '@/lib/routing/paths';

export const revalidate = 3600;

export const metadata = buildMetadata({
  title: 'Compare',
  description: 'So sánh sản phẩm và affiliate reviews.',
  path: '/compare',
});

export default async function CompareIndexPage() {
  let pages: Awaited<ReturnType<typeof listPublishedContent>> = [];
  try {
    pages = await listPublishedContent(ContentType.COMPARE, { limit: 50 });
  } catch {
    /* no DB */
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <span className="ui-badge">Compare</span>
      <h1 className="ui-page-title mt-2">So sánh sản phẩm</h1>
      <ul className="mt-8 space-y-4">
        {pages.map((p) => (
          <li key={p.id}>
            <Link
              href={getContentPath(p.type, p.slug)}
              className="font-semibold text-primary hover:text-accent transition-colors"
            >
              {p.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
