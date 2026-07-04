import { adsRepository } from '@/lib/repositories/ads.repository';

export type AdSlotConfig = {
  provider: 'adsense' | 'custom' | 'placeholder';
  slotId?: string;
  html?: string;
};

export async function getAdPlacement(slotKey: string): Promise<AdSlotConfig | null> {
  return adsRepository.getPlacement(slotKey);
}
