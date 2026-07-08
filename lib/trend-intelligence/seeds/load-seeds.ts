import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

const SeedProductSchema = z.object({
  url: z.string().url(),
  title: z.string().min(1).optional(),
  price: z.string().optional(),
  shopName: z.string().optional(),
  imageUrl: z.string().url().optional(),
});

const SeedFileSchema = z.object({
  region: z.literal('VN'),
  categorySlug: z.string().min(1),
  products: z.array(SeedProductSchema).min(1),
});

export type SeedFile = z.infer<typeof SeedFileSchema>;

const SEEDS_DIR = path.join(process.cwd(), 'data/tiktok-seeds');

export function seedFilename(region: string, categorySlug: string) {
  return `${region.toLowerCase()}-${categorySlug}.json`;
}

export async function loadSeedFile(region: string, categorySlug: string): Promise<SeedFile> {
  if (region.toUpperCase() !== 'VN') {
    throw new Error('Chỉ hỗ trợ seed Việt Nam (VN)');
  }
  const filePath = path.join(SEEDS_DIR, seedFilename('VN', categorySlug));
  const raw = await readFile(filePath, 'utf8');
  const parsed = SeedFileSchema.parse(JSON.parse(raw));
  if (parsed.categorySlug !== categorySlug) {
    throw new Error(
      `Seed mismatch: file is ${parsed.region}/${parsed.categorySlug}, expected VN/${categorySlug}`,
    );
  }
  return parsed;
}

export async function listSeedCategorySlugs(region: string): Promise<string[]> {
  const prefix = `${region.toLowerCase()}-`;
  const skip = new Set(['shops']);
  try {
    const files = await readdir(SEEDS_DIR);
    return files
      .filter((f) => f.startsWith(prefix) && f.endsWith('.json'))
      .map((f) => f.slice(prefix.length, -'.json'.length))
      .filter((slug) => !skip.has(slug))
      .sort();
  } catch {
    return [];
  }
}

const ShopSeedSchema = z.object({
  categorySlug: z.string().min(1),
  shopUrl: z.string().url(),
  shopName: z.string().optional(),
  maxProducts: z.number().int().min(1).max(50).optional(),
});

const ShopSeedsFileSchema = z.object({
  region: z.literal('VN'),
  shops: z.array(ShopSeedSchema).min(1),
});

export type ShopSeedsFile = z.infer<typeof ShopSeedsFileSchema>;

export async function loadShopSeeds(region: string): Promise<ShopSeedsFile> {
  if (region.toUpperCase() !== 'VN') {
    throw new Error('Chỉ hỗ trợ shop seed Việt Nam (VN)');
  }
  const filePath = path.join(SEEDS_DIR, 'vn-shops.json');
  const raw = await readFile(filePath, 'utf8');
  return ShopSeedsFileSchema.parse(JSON.parse(raw));
}
