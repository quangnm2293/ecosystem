import Link from 'next/link';
import { getContentPath } from '@/lib/routing/paths';

type InternalLink = {
  anchorText: string | null;
  target: { type: string; slug: string; title: string; excerpt: string | null };
};

type InternalLinksProps = {
  links: InternalLink[];
  title?: string;
};

export function InternalLinks({ links, title = 'Đọc thêm' }: InternalLinksProps) {
  if (links.length === 0) return null;

  return (
    <aside className="ui-card-muted mt-12 p-6">
      <h2 className="ui-section-title">{title}</h2>
      <ul className="mt-4 space-y-3">
        {links.map((link, i) => {
          const { target } = link;
          return (
            <li key={i}>
              <Link
                href={getContentPath(target.type as Parameters<typeof getContentPath>[0], target.slug)}
                className="block rounded-lg p-2 transition hover:bg-surface"
              >
                <span className="font-medium text-primary hover:text-accent">
                  {link.anchorText ?? target.title}
                </span>
                {target.excerpt && (
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{target.excerpt}</p>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
