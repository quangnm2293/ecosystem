import { cleanText, estimateTokens } from '@/lib/rag/chunking';

export type ChunkInput = {
  text: string;
  section?: string;
  prefix?: string;
};

export type TextChunk = {
  text: string;
  section?: string;
  tokenCount: number;
  index: number;
};

const TARGET_CHARS = 1800; // ~450 tokens
const OVERLAP_CHARS = 350; // ~87 tokens overlap
const MIN_CHUNK_CHARS = 200;

/**
 * Chunking strategy:
 * 1. Split by markdown/HTML headings (h2/h3) into sections
 * 2. Within each section, split by paragraphs
 * 3. Merge small paragraphs until TARGET_CHARS
 * 4. Overlap last OVERLAP_CHARS into next chunk (context continuity)
 */
export function chunkDocument(input: ChunkInput): TextChunk[] {
  const cleaned = cleanText(input.text);
  if (!cleaned) return [];

  const prefix = input.prefix ? `${input.prefix}\n\n` : '';
  const sections = splitByHeadings(cleaned);
  const chunks: TextChunk[] = [];
  let globalIndex = 0;

  for (const section of sections) {
    const sectionLabel = section.heading ?? input.section;
    const paragraphs = section.body.split(/\n{2,}|(?<=[.!?])\s+/).filter(Boolean);

    let buffer = '';
    for (const para of paragraphs) {
      const candidate = buffer ? `${buffer}\n\n${para}` : para;

      if (candidate.length > TARGET_CHARS && buffer.length >= MIN_CHUNK_CHARS) {
        chunks.push(makeChunk(prefix, buffer, sectionLabel, globalIndex++));
        buffer = overlapTail(buffer) + para;
      } else if (candidate.length > TARGET_CHARS) {
        // Single long paragraph — hard split
        const parts = hardSplit(para, TARGET_CHARS, OVERLAP_CHARS);
        for (const part of parts) {
          chunks.push(makeChunk(prefix, part, sectionLabel, globalIndex++));
        }
        buffer = '';
      } else {
        buffer = candidate;
      }
    }

    if (buffer.trim().length >= MIN_CHUNK_CHARS) {
      chunks.push(makeChunk(prefix, buffer, sectionLabel, globalIndex++));
    }
  }

  // Short pages (e.g. AI tools): sections may each be < MIN_CHUNK_CHARS but corpus is still useful
  if (chunks.length === 0 && cleaned.length >= MIN_CHUNK_CHARS) {
    chunks.push(makeChunk(prefix, cleaned, input.section, 0));
  }

  return chunks;
}

function makeChunk(prefix: string, body: string, section: string | undefined, index: number): TextChunk {
  const text = `${prefix}${body}`.trim();
  return { text, section, tokenCount: estimateTokens(text), index };
}

function splitByHeadings(text: string): { heading?: string; body: string }[] {
  const parts = text.split(/(?=(?:#{2,3}\s|(?:^|\n)(?:H2|H3):))/i);
  if (parts.length <= 1) return [{ body: text }];

  return parts
    .map((part) => {
      const headingMatch = part.match(/^(?:#{2,3}\s+|(?:H2|H3):\s*)(.+?)(?:\n|$)/i);
      if (headingMatch) {
        return { heading: headingMatch[1].trim(), body: part.slice(headingMatch[0].length).trim() };
      }
      return { body: part.trim() };
    })
    .filter((s) => s.body.length > 0);
}

function overlapTail(text: string): string {
  if (text.length <= OVERLAP_CHARS) return text;
  return text.slice(-OVERLAP_CHARS);
}

function hardSplit(text: string, size: number, overlap: number): string[] {
  const result: string[] = [];
  let start = 0;
  while (start < text.length) {
    result.push(text.slice(start, start + size));
    start += size - overlap;
  }
  return result;
}

/** Build ingestable text from content fields + metadata SEO sections */
export function buildContentCorpus(fields: {
  title: string;
  excerpt?: string | null;
  body?: string | null;
  keywords?: string[];
  metadata?: Record<string, unknown>;
}): string {
  const parts = [`# ${fields.title}`];
  if (fields.excerpt) parts.push(fields.excerpt);
  if (fields.keywords?.length) parts.push(`Keywords: ${fields.keywords.join(', ')}`);

  const meta = fields.metadata ?? {};
  const seo = meta.seo as { howToUse?: string[]; faq?: { q: string; a: string }[] } | undefined;
  if (seo?.howToUse?.length) {
    parts.push('## How to use\n' + seo.howToUse.map((s, i) => `${i + 1}. ${s}`).join('\n'));
  }
  if (seo?.faq?.length) {
    parts.push('## FAQ\n' + seo.faq.map((f) => `Q: ${f.q}\nA: ${f.a}`).join('\n\n'));
  }

  if (fields.body) parts.push(fields.body);
  return parts.join('\n\n');
}
