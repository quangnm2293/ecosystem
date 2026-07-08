import { z } from 'zod';

/** Platform chỉ hỗ trợ thị trường Việt Nam. */
export const SUPPORTED_REGION = 'VN' as const;

export const RegionSchema = z.literal(SUPPORTED_REGION);

export type Region = typeof SUPPORTED_REGION;

export const DEFAULT_REGION: Region = SUPPORTED_REGION;

export function parseRegion(value: string | null | undefined): Region {
  const upper = (value ?? DEFAULT_REGION).trim().toUpperCase();
  if (upper !== SUPPORTED_REGION) {
    throw new Error(`Chỉ hỗ trợ khu vực Việt Nam (VN), nhận: ${value ?? '(empty)'}`);
  }
  return SUPPORTED_REGION;
}

/** Ép về VN — dùng cho query/API (bỏ qua region ngoài phạm vi). */
export function coerceRegion(_value?: string | null): Region {
  return SUPPORTED_REGION;
}

export function assertVietnamRegion(value: string | null | undefined): Region {
  return parseRegion(value ?? DEFAULT_REGION);
}
