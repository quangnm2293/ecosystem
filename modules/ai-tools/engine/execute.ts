import '@/lib/ai/adapters';
import { createHash } from 'crypto';
import type { AiMessage } from '@/lib/ai/provider';
import { aiComplete } from '@/lib/ai/provider';
import { toolsRepository } from '@/lib/repositories/tools.repository';
import { persistTrackEvent } from '@/lib/analytics/events';
import { getToolByKey } from '@/modules/ai-tools/registry';
import type { ToolExecuteRequest, ToolExecuteResponse } from '@/modules/ai-tools/types';
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

async function getCachedResult(toolKey: string, inputHash: string): Promise<string | null> {
  try {
    return await toolsRepository.getCachedResult(toolKey, inputHash);
  } catch {
    return null;
  }
}

async function setCachedResult(toolKey: string, inputHash: string, output: string, model: string) {
  try {
    const expiresAt = new Date(Date.now() + CACHE_TTL_HOURS * 60 * 60 * 1000);
    await toolsRepository.setCachedResult(toolKey, inputHash, output, model, expiresAt);
  } catch {
    /* skip */
  }
}

function validateInput(
  fields: { name: string; required?: boolean }[],
  input: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const field of fields) {
    const val = input[field.name]?.trim() ?? '';
    if (field.required !== false && !val) {
      throw new Error(`Missing required field: ${field.name}`);
    }
    out[field.name] = val;
  }
  return out;
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
  if (cached) {
    await trackToolUsage(req, tool.toolKey, true);
    return { output: cached, cached: true, model: tool.model ?? 'cached' };
  }

  const messages: AiMessage[] = [
    { role: 'system', content: tool.systemPrompt },
    { role: 'user', content: tool.buildUserPrompt(input) },
  ];

  const model = tool.model ?? process.env.AI_DEFAULT_MODEL ?? 'gpt-4o-mini';
  const output = await aiComplete(messages, {
    model,
    temperature: tool.temperature,
    maxTokens: tool.maxTokens,
  });

  await setCachedResult(tool.toolKey, inputHash, output, model);
  await trackToolUsage(req, tool.toolKey, false);

  return { output, cached: false, model };
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
