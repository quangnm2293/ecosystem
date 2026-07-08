import { z } from 'zod';

export const SlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase kebab-case');

export type Slug = z.infer<typeof SlugSchema>;

/** Normalize raw DB/ingest strings into kebab-case before validation */
export function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 200);
}

export function parseSlug(value: string): Slug {
  return SlugSchema.parse(normalizeSlug(value) || 'product');
}
