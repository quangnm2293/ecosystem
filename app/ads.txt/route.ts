import { getAdsTxtPublisherLine } from '@/lib/ads/config';

export function GET() {
  const line = getAdsTxtPublisherLine();
  const body = line ? `${line}\n` : '# Set NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-xxx\n';

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
