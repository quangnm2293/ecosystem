import type { AiCompletionOptions, AiMessage } from '@/lib/ai/provider';

const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

export function getGroqModel(): string {
  return process.env.GROQ_MODEL ?? DEFAULT_MODEL;
}

export function isGroqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

export async function groqComplete(
  messages: AiMessage[],
  options?: AiCompletionOptions & { jsonMode?: boolean },
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY chưa được cấu hình');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: options?.model ?? getGroqModel(),
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options?.temperature ?? 0.6,
      max_tokens: options?.maxTokens ?? 4096,
      ...(options?.jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq error: ${res.status} ${err.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  const text = data.choices?.[0]?.message?.content ?? '';
  if (!text.trim()) throw new Error('Groq không trả về nội dung');
  return text;
}
