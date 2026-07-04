import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const toolsRepository = {
  async getCachedResult(toolKey: string, inputHash: string) {
    const sb = getSupabaseAdmin();
    const { data } = await sb
      .from('tool_result_cache')
      .select('id, output, expires_at')
      .eq('tool_key', toolKey)
      .eq('input_hash', inputHash)
      .maybeSingle();

    if (!data) return null;
    if (new Date(data.expires_at as string) < new Date()) {
      await sb.from('tool_result_cache').delete().eq('id', data.id as string);
      return null;
    }
    return data.output as string;
  },

  async setCachedResult(
    toolKey: string,
    inputHash: string,
    output: string,
    model: string,
    expiresAt: Date,
  ) {
    const sb = getSupabaseAdmin();
    const id = `${toolKey}_${inputHash.slice(0, 16)}`;

    await sb.from('tool_result_cache').upsert(
      {
        id,
        tool_key: toolKey,
        input_hash: inputHash,
        output,
        model,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
      },
      { onConflict: 'tool_key,input_hash' },
    );
  },
};
