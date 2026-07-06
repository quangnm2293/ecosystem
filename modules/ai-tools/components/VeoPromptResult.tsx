'use client';

import { Check, Copy, ExternalLink, Film, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getScenarioStyleLabel } from '@/modules/ai-tools/veo/scenario-styles';
import type { ToolStructuredResult } from '@/modules/ai-tools/types';

type VeoPromptResultProps = {
  data: Extract<ToolStructuredResult, { kind: 'veo-prompt-scripts' }>;
};

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? 'Đã copy' : label}
    </button>
  );
}

export function VeoPromptResult({ data }: VeoPromptResultProps) {
  const [activeId, setActiveId] = useState(data.scenarios[0]?.id ?? '');

  const active = data.scenarios.find((s) => s.id === activeId) ?? data.scenarios[0];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            {data.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.imageUrl}
                alt=""
                className="size-16 shrink-0 rounded-lg border border-border-muted object-cover"
              />
            )}
            <div className="min-w-0">
              <h3 className="text-lg font-semibold tracking-tight text-foreground">{data.productTitle}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {data.scenarios.length} kịch bản Veo 3 · {data.price ? `Giá ${data.price}` : 'Affiliate TikTok Shop'}
              </p>
              <a
                href={data.productUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Xem sản phẩm
                <ExternalLink className="size-3" />
              </a>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="gap-1">
            <Film className="size-3" />
            Veo 3
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Sparkles className="size-3" />
            9:16 · 8s
          </Badge>
        </div>
      </div>

      {data.productInsights && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-4 space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">Phân tích AI từ mô tả sản phẩm</p>
          <p className="text-sm text-foreground leading-relaxed">{data.productInsights.productSummary}</p>
          <div className="flex flex-wrap gap-2 text-xs">
            {data.productInsights.category && (
              <Badge variant="secondary">{data.productInsights.category}</Badge>
            )}
            {data.productInsights.targetAudience && (
              <Badge variant="outline">{data.productInsights.targetAudience}</Badge>
            )}
          </div>
          {data.productInsights.hookAngles.length > 0 && (
            <div className="space-y-2 pt-1">
              <p className="text-xs font-medium text-muted-foreground">Góc hook đề xuất</p>
              {data.productInsights.hookAngles.slice(0, 4).map((h) => (
                <div key={h.angle + h.sampleHook} className="rounded-lg bg-background/80 px-3 py-2 text-sm ring-1 ring-border-muted">
                  <span className="font-medium text-foreground">{h.angle}:</span>{' '}
                  <span className="text-foreground">{h.sampleHook}</span>
                  <p className="mt-0.5 text-xs text-muted-foreground">{h.rationale}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {data.sellingPoints.length > 0 && (
        <div className="rounded-xl border border-border-muted bg-surface-muted/50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Điểm bán hàng</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {data.sellingPoints.map((p) => (
              <li key={p} className="rounded-full bg-background px-3 py-1 text-sm text-foreground ring-1 ring-border-muted">
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {data.scenarios.map((sc) => (
          <button
            key={sc.id}
            type="button"
            onClick={() => setActiveId(sc.id)}
            className={cn(
              'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              active?.id === sc.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-surface-muted text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {sc.title}
          </button>
        ))}
      </div>

      {active && (
        <div className="space-y-5 rounded-xl border border-border-muted p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold text-foreground">{active.title}</h4>
            <Badge variant="outline">{getScenarioStyleLabel(active.style)}</Badge>
            {active.style.startsWith('hook-') && (
              <Badge variant="secondary" className="bg-amber-500/15 text-amber-800 dark:text-amber-200">
                Hook 3s
              </Badge>
            )}
            <Badge variant="secondary">{active.durationSec}s</Badge>
          </div>

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-800 dark:text-amber-200">Hook</p>
            <p className="mt-1 text-sm font-medium text-foreground">{active.hook}</p>
          </div>

          <div className="overflow-hidden rounded-lg border border-border-muted">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-muted bg-surface-muted/80 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 w-20">Giây</th>
                  <th className="px-3 py-2">Hình ảnh</th>
                  <th className="px-3 py-2 hidden sm:table-cell">Voiceover</th>
                  <th className="px-3 py-2 hidden md:table-cell">Text</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let t = 0;
                  return active.scenes.map((scene, i) => {
                    const start = t;
                    const end = t + scene.durationSec;
                    t = end;
                    return (
                      <tr key={i} className="border-b border-border-muted last:border-0">
                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                          {start}–{end}s
                        </td>
                        <td className="px-3 py-2 text-foreground">{scene.visual}</td>
                        <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">
                          {scene.voiceover ?? '—'}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground hidden md:table-cell">
                          {scene.onScreenText ?? '—'}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">Veo 3 prompt (tiếng Anh)</p>
              <CopyButton text={active.veoPrompt} label="Copy prompt" />
            </div>
            <pre className="max-h-40 overflow-auto rounded-lg bg-surface-muted p-4 text-xs leading-relaxed text-foreground whitespace-pre-wrap">
              {active.veoPrompt}
            </pre>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Caption</p>
              <p className="mt-1 text-sm text-foreground">{active.caption}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Hashtags</p>
              <p className="mt-1 text-sm text-primary">
                {active.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')}
              </p>
            </div>
          </div>

          {active.cta && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">CTA:</span> {active.cta}
            </p>
          )}
        </div>
      )}

      {data.veoTips && data.veoTips.length > 0 && (
        <div className="rounded-xl border border-border-muted bg-surface-muted/30 px-4 py-4">
          <p className="text-sm font-medium text-foreground">Mẹo dùng Veo 3</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
            {data.veoTips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-3 border-t border-border-muted pt-4">
        <Link href="/tools/ai-url-to-video" className={buttonVariants({ variant: 'default', size: 'sm' })}>
          Tạo video Veo 3 ngay
        </Link>
        {active && <CopyButton text={active.veoPrompt} label="Copy prompt đang chọn" />}
      </div>
    </div>
  );
}
