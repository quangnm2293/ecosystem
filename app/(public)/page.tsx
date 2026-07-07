import Link from 'next/link';
import { AdSlot } from '@/components/ads/AdSlot';
import { SITE_NAME } from '@/lib/config/site';
import { VERTICALS } from '@/lib/routing/verticals';
import { buildMetadata, buildWebSiteJsonLd } from '@/lib/seo/metadata';
import { JsonLdScript } from '@/lib/seo/json-ld';

export const metadata = buildMetadata({
  title: SITE_NAME,
  description: 'Nền tảng đa vertical: AI tools, blog SEO, affiliate compare, games, dev tools.',
  path: '/',
});

export default function HomePage() {
  return (
    <>
      <JsonLdScript data={buildWebSiteJsonLd()} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[var(--gradient-from)] to-[var(--gradient-to)] px-4 py-16 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggIGQ9Ik0zNiAzNGg0djRoLTR6bTAgMGg0djRoLTR6bTAgMGg0djRoLTR6bTAgMGg0djRoLTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-40" />
        <div className="relative mx-auto max-w-5xl">
          <span className="inline-block rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent-foreground">
            SEO-first Platform
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">{SITE_NAME}</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/90">
            Kiến trúc SEO-first, sẵn sàng scale content và monetization (Ads + Affiliate + SaaS).
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-12">
        <AdSlot slotKey="home-mid" className="mb-8" />
        <div className="grid gap-4 sm:grid-cols-2">
          {VERTICALS.map((v) => (
            <Link key={v.basePath} href={v.basePath} className="ui-link-card group">
              <div className="flex items-start gap-3">
                <span className="vertical-card-icon mt-0.5">
                  {v.label[0]}
                </span>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">{v.label}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">ISR {v.defaultRevalidate}s</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
