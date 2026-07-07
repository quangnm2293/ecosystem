import { z } from 'zod';

export const SlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase kebab-case');

export type Slug = z.infer<typeof SlugSchema>;

export function parseSlug(value: string): Slug {
  return SlugSchema.parse(value);
}
