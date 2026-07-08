import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { getSessionUser } from '@/lib/auth/session';

export async function requireUser(): Promise<User | NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return user;
}

export function isUser(result: User | NextResponse): result is User {
  return !(result instanceof NextResponse);
}
