import { ToolRunner } from '@/modules/ai-tools/components/ToolRunner';
import { ToolSeoSections } from '@/modules/ai-tools/components/ToolSeoSections';
import { AdSlot } from '@/components/ads/AdSlot';
import { toPublicTool, type AiToolDefinition } from '@/modules/ai-tools/types';
import { JsonLdScript } from '@/lib/seo/json-ld';
import { buildSoftwareAppJsonLd } from '@/lib/seo/metadata';
import { buildHowToJsonLd } from '@/modules/ai-tools/seo/json-ld';

type AiToolPageProps = {
  tool: AiToolDefinition;
  contentId?: string;
};

export function AiToolPage({ tool, contentId }: AiToolPageProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <JsonLdScript
        data={[
          buildSoftwareAppJsonLd({
            name: tool.name,
            description: tool.description,
            path: `/tools/${tool.slug}`,
          }),
          buildHowToJsonLd(tool.name, tool.seo.howToUse),
        ]}
      />

      <div className="mb-2">
        <span className="ui-badge">{tool.categoryLabel ?? tool.category}</span>
      </div>
      <h1 className="ui-page-title">{tool.name}</h1>
      <p className="mt-3 text-lg text-muted-foreground">{tool.description}</p>

      <div className="mt-6">
        <AdSlot slotKey="tool-top" />
      </div>

      <div className="mt-8">
        <ToolRunner tool={toPublicTool(tool)} contentId={contentId} />
      </div>

      <ToolSeoSections tool={tool} />

      <div className="mt-12">
        <AdSlot slotKey="tool-footer" className="my-4" />
      </div>
    </div>
  );
}
