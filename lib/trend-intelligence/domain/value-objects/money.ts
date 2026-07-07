import { z } from 'zod';

export const MoneySchema = z.object({
  amount: z.number().int().nonnegative(),
  currency: z.string().trim().min(3).max(3).default('VND'),
});

export type Money = z.infer<typeof MoneySchema>;

export function parseMoney(amount: number | null | undefined, currency = 'VND'): Money | null {
  if (amount == null) return null;
  return MoneySchema.parse({ amount, currency });
}
