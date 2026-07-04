import Link from 'next/link';
import { ContentType } from '@/lib/supabase/enums';
import { listPublishedContent } from '@/lib/content/service';
import { buildMetadata } from '@/lib/seo/metadata';
import { getContentPath } from '@/lib/routing/paths';

export const revalidate = 1800;

export const metadata = buildMetadata({
  title: 'Blog',
  description: 'Bài viết SEO và hướng dẫn.',
  path: '/blog',
});

export default async function BlogIndexPage() {
  let posts: Awaited<ReturnType<typeof listPublishedContent>> = [];
  try {
    posts = await listPublishedContent(ContentType.BLOG, { limit: 50 });
  } catch {
    /* DB chưa connect — dev friendly */
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <span className="ui-badge">Blog</span>
      <h1 className="ui-page-title mt-2">Bài viết & Hướng dẫn</h1>
      <ul className="mt-8 space-y-6">
        {posts.map((post) => (
          <li key={post.id} className="ui-card p-5">
            <Link
              href={getContentPath(post.type, post.slug)}
              className="text-xl font-semibold text-primary hover:text-accent transition-colors"
            >
              {post.title}
            </Link>
            {post.excerpt && <p className="mt-2 text-muted-foreground">{post.excerpt}</p>}
          </li>
        ))}
        {posts.length === 0 && (
          <p className="text-muted-foreground">Chưa có bài viết. Seed DB hoặc publish content.</p>
        )}
      </ul>
    </div>
  );
}
