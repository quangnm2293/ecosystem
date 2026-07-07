/** Validate DATABASE_URL before connecting — catches common Supabase copy/paste issues */

export function diagnoseDatabaseUrl(raw: string): string[] {
  const hints: string[] = [];

  try {
    const parsed = new URL(raw);
    const afterProto = raw.split('://')[1] ?? '';
    const atCount = afterProto.split('@').length - 1;

    if (atCount > 1) {
      hints.push(
        'Password có ký tự @ (hoặc ký tự đặc biệt) chưa URL-encode. Ví dụ: @ → %40, # → %23.',
      );
      hints.push(
        'Chạy: node -e "console.log(encodeURIComponent(process.argv[1]))" \'YOUR_PASSWORD\'',
      );
    }

    if (!parsed.password) {
      hints.push('Thiếu password trong DATABASE_URL.');
    }

    if (parsed.hostname.includes('pooler') && parsed.username === 'postgres') {
      hints.push(
        'Pooler URI dùng user postgres.[project-ref], không phải postgres.',
      );
    }

    if (!parsed.hostname.includes('supabase')) {
      hints.push('Host không giống Supabase — kiểm tra lại connection string.');
    }
  } catch {
    hints.push('DATABASE_URL không phải URL hợp lệ.');
  }

  return hints;
}

export function printDatabaseUrlHints(raw: string) {
  const hints = diagnoseDatabaseUrl(raw);
  if (hints.length > 0) {
    console.error('\nGợi ý sửa DATABASE_URL:');
    for (const h of hints) console.error(`  • ${h}`);
    console.error(
      '\nLấy URI mới: Supabase Dashboard → Settings → Database → Connection string → URI (Direct, port 5432).',
    );
    console.error('Hoặc reset password: Database → Database password → Reset.\n');
  }
}
