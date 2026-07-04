import type { AiProvider, AiMessage, AiCompletionOptions } from '@/lib/ai/provider';
import { registerAiProvider } from '@/lib/ai/provider';

class OpenAiProvider implements AiProvider {
  name = 'openai';

  async complete(messages: AiMessage[], options?: AiCompletionOptions): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: options?.model ?? 'gpt-4o-mini',
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 1500,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI error: ${res.status} ${err}`);
    }

    const data = (await res.json()) as {
      choices: { message: { content: string } }[];
    };
    return data.choices[0]?.message?.content ?? '';
  }
}

class MockAiProvider implements AiProvider {
  name = 'mock';

  async complete(messages: AiMessage[], options?: AiCompletionOptions): Promise<string> {
    const user = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    await new Promise((r) => setTimeout(r, 800));

    if (user.includes('TikTok') || user.includes('script')) {
      return `**[0-3s HOOK]** Bạn có biết 80% creator bỏ cuộc vì thiếu script?\n\n**[3-20s BODY]**\n${user.slice(0, 120)}...\n\n**[CTA]** Follow để nhận thêm template miễn phí.\n\n**ON-SCREEN:** "Save this 📌"`;
    }
    if (user.includes('Platform:') || user.includes('Subject:')) {
      return `${user.match(/Subject: (.+)/)?.[1] ?? 'subject'}, highly detailed, cinematic lighting, 8k, sharp focus, professional photography`;
    }
    return `## ${user.match(/about: "(.+?)"/)?.[1] ?? 'Your Topic'}\n\nĐây là bản demo (mock AI). Cấu hình \`OPENAI_API_KEY\` để dùng LLM thật.\n\n### Giới thiệu\nNội dung được generate dựa trên input của bạn...\n\n### Phần chính\n- Điểm 1 liên quan đến chủ đề\n- Điểm 2 với giá trị thực tế\n- Điểm 3 actionable\n\n### Kết luận\nThử chỉnh tone/length và generate lại.\n\n**CTA:** Chia sẻ bài nếu hữu ích!`;
  }
}

registerAiProvider(new MockAiProvider());

if (process.env.OPENAI_API_KEY) {
  registerAiProvider(new OpenAiProvider());
}

/** Resolve provider: openai if key exists, else mock */
export function resolveAiProviderName(): string {
  if (process.env.AI_PROVIDER === 'openai' || process.env.OPENAI_API_KEY) return 'openai';
  return 'mock';
}
