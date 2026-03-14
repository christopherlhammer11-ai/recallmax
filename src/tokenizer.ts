/**
 * Fast approximate token counter.
 * Uses the ~4 chars per token heuristic for English text.
 * Good enough for compression targeting — no external dependencies needed.
 */
const AVG_CHARS_PER_TOKEN = 4;

export function estimateTokens(text: string): number {
  if (!text) return 0;
  // Split on whitespace and punctuation boundaries for better accuracy
  const words = text.split(/\s+/).filter(Boolean);
  let tokens = 0;
  for (const word of words) {
    // Short words ≈ 1 token, longer words scale
    tokens += Math.max(1, Math.ceil(word.length / AVG_CHARS_PER_TOKEN));
  }
  return tokens;
}

export function truncateToTokens(text: string, maxTokens: number): string {
  const words = text.split(/\s+/);
  let tokens = 0;
  const kept: string[] = [];

  for (const word of words) {
    const wordTokens = Math.max(1, Math.ceil(word.length / AVG_CHARS_PER_TOKEN));
    if (tokens + wordTokens > maxTokens) break;
    kept.push(word);
    tokens += wordTokens;
  }

  return kept.join(' ');
}
