import '@/lib/ai/adapters';
import { createHash } from 'crypto';
import type { AiMessage } from '@/lib/ai/provider';
import { aiComplete } from '@/lib/ai/provider';
import { toolsRepository } from '@/lib/repositories/tools.repository';
import { persistTrackEvent } from '@/lib/analytics/events';
import { getToolByKey } from '@/modules/ai-tools/registry';
import type { ToolCustomResult, ToolExecuteRequest, ToolExecuteResponse, ToolStructuredResult } from '@/modules/ai-tools/types';
import { checkRateLimit } from '@/modules/ai-tools/engine/rate-limit';

const CACHE_TTL_HOURS = 24;

function hashInput(toolKey: string, input: Record<string, string>): string {
  const normalized = JSON.stringify(
    Object.keys(input)
      .sort()
      .reduce<Record<string, string>>((acc, k) => {
        acc[k] = input[k]?.trim() ?? '';
        return acc;
      }, {}),
  );
  return createHash('sha256').update(`${toolKey}:${normalized}`).digest('hex');
}

function parseCachedPayload(cached: string): {
  output: string;
  videoUrl?: string;
  structured?: ToolStructuredResult;
} {
  try {
    const parsed = JSON.parse(cached) as {
      output?: string;
      videoUrl?: string;
      structured?: ToolStructuredResult;
    };
    if (parsed.output) {
      return { output: parsed.output, videoUrl: parsed.videoUrl, structured: parsed.structured };
    }
  } catch {
    /* plain text cache */
  }
  return { output: cached };
}

function serializeCachePayload(
  output: string,
  videoUrl?: string,
  structured?: ToolStructuredResult,
): string {
  if (videoUrl || structured) {
    return JSON.stringify({ output, videoUrl, structured });
  }
  return output;
}

async function getCachedResult(
  toolKey: string,
  inputHash: string,
): Promise<{ output: string; videoUrl?: string; structured?: ToolStructuredResult } | null> {
  try {
    const cached = await toolsRepository.getCachedResult(toolKey, inputHash);
    if (!cached) return null;
    return parseCachedPayload(cached);
  } catch {
    return null;
  }
}

async function setCachedResult(
  toolKey: string,
  inputHash: string,
  output: string,
  model: string,
  videoUrl?: string,
  structured?: ToolStructuredResult,
) {
  try {
    const expiresAt = new Date(Date.now() + CACHE_TTL_HOURS * 60 * 60 * 1000);
    await toolsRepository.setCachedResult(
      toolKey,
      inputHash,
      serializeCachePayload(output, videoUrl, structured),
      model,
      expiresAt,
    );
  } catch {
    /* skip */
  }
}

function validateInput(
  fields: { name: string; required?: boolean; defaultValue?: string }[],
  input: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const field of fields) {
    let val = input[field.name]?.trim() ?? '';
    if (!val && field.defaultValue !== undefined && field.defaultValue !== '') {
      val = field.defaultValue;
    }
    if (field.required !== false && !val) {
      throw new Error(`Missing required field: ${field.name}`);
    }
    out[field.name] = val;
  }
  return out;
}

function shouldCacheResult(toolKey: string, output: string, videoUrl?: string): boolean {
  if (toolKey === 'url-to-video' && !videoUrl) return false;
  if (output.includes('⚠️ Không tạo được') || output.includes('⚠️ Không render được')) return false;
  return true;
}

function isCachedFailure(output: string, videoUrl?: string): boolean {
  if (videoUrl) return false;
  return output.includes('⚠️ Không tạo được') || output.includes('⚠️ Không render được');
}

function resolveCustomResult(result: string | ToolCustomResult): {
  output: string;
  videoUrl?: string;
  model?: string;
  structured?: ToolStructuredResult;
} {
  if (typeof result === 'string') return { output: result };
  return {
    output: result.output,
    videoUrl: result.videoUrl,
    model: result.model,
    structured: result.structured,
  };
}

export async function executeTool(req: ToolExecuteRequest): Promise<ToolExecuteResponse> {
  const tool = getToolByKey(req.toolKey);
  if (!tool) throw new Error('Tool not found');
  if (!tool.implemented) throw new Error('Tool not available yet');

  const visitorKey = req.visitorId ?? req.sessionId ?? 'anonymous';
  const rate = checkRateLimit(visitorKey, req.toolKey);
  if (!rate.allowed) {
    throw new Error(`Rate limit exceeded. Retry in ${rate.retryAfterSec}s`);
  }

  const input = validateInput(tool.inputFields, req.input);
  const inputHash = hashInput(tool.toolKey, input);

  const cached = await getCachedResult(tool.toolKey, inputHash);
  if (cached && !isCachedFailure(cached.output, cached.videoUrl)) {
    await trackToolUsage(req, tool.toolKey, true);
    return {
      output: cached.output,
      cached: true,
      model: tool.model ?? 'cached',
      videoUrl: cached.videoUrl,
      structured: cached.structured,
    };
  }

  let output: string;
  let videoUrl: string | undefined;
  let structured: ToolStructuredResult | undefined;
  let model: string;

  if (tool.customExecute) {
    const result = resolveCustomResult(await tool.customExecute(input));
    output = result.output;
    videoUrl = result.videoUrl;
    structured = result.structured;
    model =
      result.model ??
      tool.model ??
      (process.env.GROQ_API_KEY
        ? process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile'
        : process.env.GEMINI_API_KEY
          ? process.env.GEMINI_MODEL ?? 'gemini-2.0-flash'
          : 'mock');
  } else {
    const messages: AiMessage[] = [
      { role: 'system', content: tool.systemPrompt },
      { role: 'user', content: tool.buildUserPrompt(input) },
    ];

    model = tool.model ?? process.env.AI_DEFAULT_MODEL ?? 'gpt-4o-mini';
    const provider = tool.provider ?? process.env.AI_PROVIDER ?? undefined;
    output = await aiComplete(messages, {
      model,
      temperature: tool.temperature,
      maxTokens: tool.maxTokens,
      provider,
    });
  }

  if (shouldCacheResult(tool.toolKey, output, videoUrl)) {
    await setCachedResult(tool.toolKey, inputHash, output, model, videoUrl, structured);
  }
  await trackToolUsage(req, tool.toolKey, false);

  return { output, cached: false, model, videoUrl, structured };
}

async function trackToolUsage(req: ToolExecuteRequest, toolKey: string, fromCache: boolean) {
  if (!req.sessionId) return;
  try {
    await persistTrackEvent({
      eventType: 'tool_used',
      sessionId: req.sessionId,
      visitorId: req.visitorId,
      contentId: req.contentId,
      path: `/tools/${toolKey}`,
      metadata: { tool_key: toolKey, cached: fromCache },
    });
  } catch {
    /* tracking optional without DB */
  }
}
