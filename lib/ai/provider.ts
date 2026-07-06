export type AiMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export type AiCompletionOptions = {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
};

export type AiProvider = {
  name: string;
  complete(messages: AiMessage[], options?: AiCompletionOptions): Promise<string>;
};

const providers: Record<string, AiProvider> = {};

export function registerAiProvider(provider: AiProvider) {
  providers[provider.name] = provider;
}

export function getAiProvider(name?: string): AiProvider {
  const resolved =
    name ??
    process.env.AI_PROVIDER ??
    (process.env.GROQ_API_KEY
      ? 'groq'
      : process.env.GEMINI_API_KEY
        ? 'gemini'
        : process.env.OPENAI_API_KEY
          ? 'openai'
          : 'mock');
  const provider = providers[resolved];
  if (!provider) throw new Error(`Unknown AI provider: ${resolved}. Import @/lib/ai/adapters`);
  return provider;
}

export async function aiComplete(
  messages: AiMessage[],
  options?: AiCompletionOptions & { provider?: string },
) {
  const provider = getAiProvider(options?.provider);
  return provider.complete(messages, options);
}
