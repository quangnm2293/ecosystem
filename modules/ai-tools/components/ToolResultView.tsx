'use client';

import type { ToolStructuredResult } from '@/modules/ai-tools/types';
import { VeoPromptResult } from '@/modules/ai-tools/components/VeoPromptResult';
import { ProductRankResult } from '@/modules/tiktok-analytics/components/ProductRankResult';

type ToolResultViewProps = {
  structured?: ToolStructuredResult | null;
  output?: string | null;
};

export function ToolResultView({ structured, output }: ToolResultViewProps) {
  if (structured?.kind === 'tiktok-product-rank') {
    return <ProductRankResult data={structured} />;
  }

  if (structured?.kind === 'veo-prompt-scripts') {
    return <VeoPromptResult data={structured} />;
  }

  if (output) {
    return (
      <div className="max-h-120 overflow-auto p-6">
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
          {output}
        </pre>
      </div>
    );
  }

  return null;
}
