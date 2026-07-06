import Link from 'next/link';
import { buildMetadata } from '@/lib/seo/metadata';
import {
  FASTMOSS_FEATURE_MAP,
  TIKTOK_ANALYTICS_TOOLS,
} from '@/modules/tiktok-analytics/registry';
import { getToolBySlug } from '@/modules/ai-tools/registry';

export const revalidate = 3600;

export const metadata = buildMetadata({
  title: 'TikTok Shop Analytics — FastMoss Alternative',
  description:
    'Bộ công cụ phân tích TikTok Shop: sản phẩm bán chạy, KOL, livestream, quảng cáo, VOC — API FastMoss hoặc crawl + AI.',
  path: '/tools/tiktok-shop',
});

const CONTENT_TOOLS = [
  { slug: 'ai-tiktok-script-generator', label: 'Kịch bản + prompt Veo 3' },
  { slug: 'ai-url-to-video', label: 'URL → Video affiliate' },
];

export default function TikTokShopHubPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <span className="ui-badge">TikTok Shop</span>
      <h1 className="ui-page-title mt-2">TikTok Shop Analytics</h1>
      <p className="mt-2 text-muted-foreground">
        Bộ công cụ lấy cảm hứng từ{' '}
        <a
          href="https://www.fastmoss.com/vi"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline"
        >
          FastMoss
        </a>
        — ưu tiên{' '}
        <a
          href="https://developers.fastmoss.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline"
        >
          FastMoss OpenAPI
        </a>
        , fallback crawl + AI.
      </p>

      <section className="mt-10">
        <h2 className="ui-section-title">Phân tích dữ liệu</h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {TIKTOK_ANALYTICS_TOOLS.map((tool) => (
            <li key={tool.toolKey}>
              <Link href={`/tools/${tool.slug}`} className="ui-link-card group h-full">
                <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  {tool.name}
                </span>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{tool.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="ui-section-title">Sáng tạo nội dung (AI)</h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {CONTENT_TOOLS.map(({ slug, label }) => {
            const tool = getToolBySlug(slug);
            if (!tool) return null;
            return (
              <li key={slug}>
                <Link href={`/tools/${slug}`} className="ui-link-card group h-full">
                  <span className="font-semibold">{label}</span>
                  <p className="mt-2 text-sm text-muted-foreground">{tool.description}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-10 ui-card p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">
          Ánh xạ tính năng FastMoss
        </h2>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-border-muted text-left text-muted-foreground">
              <th className="pb-2 pr-4">FastMoss</th>
              <th className="pb-2">Tool của chúng ta</th>
            </tr>
          </thead>
          <tbody>
            {FASTMOSS_FEATURE_MAP.map((row) => (
              <tr key={row.slug} className="border-b border-border-muted/50">
                <td className="py-2 pr-4 text-foreground">{row.fastmoss}</td>
                <td className="py-2">
                  <Link href={`/tools/${row.slug}`} className="text-primary hover:underline">
                    /tools/{row.slug}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="mt-8 text-sm text-muted-foreground">
        Cấu hình <code className="text-foreground">FASTMOSS_CLIENT_ID</code> +{' '}
        <code className="text-foreground">FASTMOSS_CLIENT_SECRET</code> trong .env để dùng API chính
        thức. Không có API → dùng <code className="text-foreground">GROQ_API_KEY</code> hoặc{' '}
        <code className="text-foreground">GEMINI_API_KEY</code>.
      </p>
    </div>
  );
}
