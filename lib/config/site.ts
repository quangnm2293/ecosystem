function resolveSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');

  // Production Vercel domain (ecosystem-tools.vercel.app) — ưu tiên khi SITE_URL trỏ preview cũ
  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL?.replace(/^https?:\/\//, '');
  if (vercelProduction) {
    const productionUrl = `https://${vercelProduction}`;
    if (
      !configured ||
      configured.includes('localhost') ||
      configured.includes('git-develop') ||
      configured.includes('projects.vercel.app')
    ) {
      return productionUrl;
    }
  }

  if (configured) return configured;
  return 'http://localhost:3000';
}

export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Ecosystem Platform';
export const SITE_URL = resolveSiteUrl();
export const SITE_LOCALE = process.env.NEXT_PUBLIC_SITE_LOCALE ?? 'vi_VN';
export const SITE_LOGO = '/logo.png';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`;
