import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { ContentType } from '@/lib/supabase/enums';
import { getContentPath } from '@/lib/routing/paths';
import { z } from 'zod';

const BodySchema = z.object({
  secret: z.string(),
  type: z.nativeEnum(ContentType),
  slug: z.string(),
  paths: z.array(z.string()).optional(),
});

/** On-demand ISR — webhook từ CMS/admin sau khi publish */
export async function POST(request: Request) {
  const body = BodySchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  if (body.data.secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const paths = body.data.paths ?? [getContentPath(body.data.type, body.data.slug)];

  for (const path of paths) {
    revalidatePath(path);
  }

  return NextResponse.json({ revalidated: paths, now: Date.now() });
}
