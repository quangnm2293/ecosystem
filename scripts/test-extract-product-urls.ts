import { extractProductUrlsFromHtml } from '@/lib/scraper/tiktok-shop';

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const sample = `
<a href="/view/product/1729382258395804980">A</a>
{"product_id":"1730101001001001001"}
<link href="https://www.tiktok.com/vn/pdp/foo/1730202002002002002"/>
`;

const urls = extractProductUrlsFromHtml(sample, 10);
assert(urls.length === 3, `expected 3 urls, got ${urls.length}: ${urls.join(',')}`);
assert(urls.every((u) => u.includes('/view/product/')), 'normalized to view/product');
console.log('extractProductUrlsFromHtml OK', urls);
