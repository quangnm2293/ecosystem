import Link from 'next/link';
import type { AiToolDefinition } from '@/modules/ai-tools/types';
import { getRelatedTools } from '@/modules/ai-tools/registry';
import { JsonLdScript } from '@/lib/seo/json-ld';
import { buildFaqJsonLd } from '@/modules/ai-tools/seo/json-ld';

type ToolSeoSectionsProps = {
  tool: AiToolDefinition;
};

export function ToolSeoSections({ tool }: ToolSeoSectionsProps) {
  const related = getRelatedTools(tool);
  const faqJsonLd = buildFaqJsonLd(tool.seo.faq);

  return (
    <div className="mt-16 space-y-12 border-t border-border pt-12">
      {faqJsonLd && <JsonLdScript data={faqJsonLd} />}

      <section id="how-to-use">
        <h2 className="ui-section-title">Cách sử dụng {tool.name}</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-muted-foreground">
          {tool.seo.howToUse.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </section>

      {tool.seo.examples.length > 0 && (
        <section id="examples">
          <h2 className="ui-section-title">Ví dụ</h2>
          <div className="mt-4 space-y-4">
            {tool.seo.examples.map((ex, i) => (
              <div key={i} className="ui-card p-4">
                <h3 className="font-medium text-foreground">{ex.title}</h3>
                <p className="mt-2 text-sm text-muted">
                  Input: {Object.entries(ex.input).map(([k, v]) => `${k}=${v}`).join(', ')}
                </p>
                <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-surface-muted p-3 text-sm text-foreground">
                  {ex.outputPreview}
                </pre>
              </div>
            ))}
          </div>
        </section>
      )}

      {tool.seo.faq.length > 0 && (
        <section id="faq">
          <h2 className="ui-section-title">FAQ</h2>
          <dl className="mt-4 space-y-4">
            {tool.seo.faq.map((item, i) => (
              <div key={i}>
                <dt className="font-medium text-foreground">{item.q}</dt>
                <dd className="mt-1 text-muted-foreground">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {related.length > 0 && (
        <section id="related-tools">
          <h2 className="ui-section-title">Công cụ liên quan</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {related.map((r) => (
              <li key={r.toolKey}>
                <Link href={`/tools/${r.slug}`} className="ui-link-card !p-4">
                  <span className="font-medium text-foreground">{r.name}</span>
                  <p className="mt-1 text-sm text-muted line-clamp-2">{r.description}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
