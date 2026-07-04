import type { JsonLd } from '@/lib/seo/metadata';

type JsonLdScriptProps = {
  data: JsonLd | JsonLd[];
};

/** Inject schema.org JSON-LD — dùng trong Server Components */
export function JsonLdScript({ data }: JsonLdScriptProps) {
  const schemas = Array.isArray(data) ? data : [data];
  return (
    <>
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}
