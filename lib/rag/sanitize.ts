const INJECTION_PATTERNS = [
  /ignore (all )?(previous|above|prior) instructions/i,
  /you are now/i,
  /system\s*:/i,
  /<\/?system>/i,
  /disregard (your|the) (rules|guidelines)/i,
  /jailbreak/i,
];

/** Sanitize user question + strip risky patterns from retrieved chunks */
export function sanitizeQuestion(question: string): string {
  let q = question.trim().slice(0, 500);
  for (const pattern of INJECTION_PATTERNS) {
    q = q.replace(pattern, '[filtered]');
  }
  return q.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}

export function sanitizeChunk(text: string): string {
  let t = text;
  for (const pattern of INJECTION_PATTERNS) {
    t = t.replace(pattern, '');
  }
  return t.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').trim();
}

/** Wrap context to reduce prompt injection from indexed content */
export function wrapContextBlock(chunk: string, index: number): string {
  return `<source id="${index}">\n${sanitizeChunk(chunk)}\n</source>`;
}
