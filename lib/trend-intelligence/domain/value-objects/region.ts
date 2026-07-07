import { z } from 'zod';

export const RegionSchema = z
  .string()
  .trim()
  .min(2)
  .max(8)
  .regex(/^[A-Z]{2}$/, 'Region must be ISO 3166-1 alpha-2 uppercase');

export type Region = z.infer<typeof RegionSchema>;

export const DEFAULT_REGION: Region = 'VN';

export function parseRegion(value: string): Region {
  return RegionSchema.parse(value.toUpperCase());
}
