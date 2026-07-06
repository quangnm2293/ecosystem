import type { AiCompletionOptions, AiMessage } from '@/lib/ai/provider';
import { geminiComplete } from '@/lib/ai/gemini';
import { getGeminiModel } from '@/lib/ai/gemini';
import { groqComplete, getGroqModel, isGroqConfigured } from '@/lib/ai/groq';
import { isGeminiConfigured } from '@/lib/ai/gemini';

/** Free-tier LLM: ưu tiên Groq → Gemini Flash */
export function resolveFreeLlmLabel(): string {
  if (isGroqConfigured()) return getGroqModel();
  if (isGeminiConfigured()) return process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
  return 'mock';
}

export function isFreeLlmConfigured(): boolean {
  return isGroqConfigured() || isGeminiConfigured();
}

export async function freeLlmComplete(
  messages: AiMessage[],
  options?: AiCompletionOptions & { jsonMode?: boolean },
): Promise<string> {
  const prefer = process.env.VIDEO_AI_PROVIDER?.toLowerCase();

  if (prefer === 'gemini' && isGeminiConfigured()) {
    return geminiComplete(messages, {
      ...options,
      model: options?.model ?? process.env.GEMINI_MODEL ?? 'gemini-2.0-flash',
      jsonMode: options?.jsonMode,
    });
  }

  if (prefer === 'groq' && isGroqConfigured()) {
    return groqComplete(messages, { ...options, model: options?.model ?? getGroqModel() });
  }

  if (isGroqConfigured()) {
    return groqComplete(messages, { ...options, model: options?.model ?? getGroqModel() });
  }

  if (isGeminiConfigured()) {
    return geminiComplete(messages, {
      ...options,
      model: options?.model ?? process.env.GEMINI_MODEL ?? 'gemini-2.0-flash',
      jsonMode: options?.jsonMode,
    });
  }

  throw new Error('Cần GROQ_API_KEY hoặc GEMINI_API_KEY (free tier)');
}
