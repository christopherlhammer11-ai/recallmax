/**
 * Deduplication engine.
 * Finds and merges semantically similar content using n-gram fingerprinting.
 */

const SIMILARITY_THRESHOLD = 0.4;

export function deduplicateChunks(chunks: string[]): string[] {
  if (chunks.length <= 1) return chunks;

  const kept: string[] = [];
  const fingerprints: Set<string>[] = [];

  for (const chunk of chunks) {
    const fp = fingerprint(chunk);
    let isDuplicate = false;

    for (let i = 0; i < fingerprints.length; i++) {
      if (jaccardSimilarity(fp, fingerprints[i]) > SIMILARITY_THRESHOLD) {
        // Keep the longer (more detailed) version
        if (chunk.length > kept[i].length) {
          kept[i] = chunk;
          fingerprints[i] = fp;
        }
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      kept.push(chunk);
      fingerprints.push(fp);
    }
  }

  return kept;
}

function fingerprint(text: string): Set<string> {
  const normalized = text.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
  const words = normalized.split(' ').filter(Boolean);
  const ngrams = new Set<string>();

  // Use bigrams for better matching on short texts
  for (let i = 0; i < words.length - 1; i++) {
    ngrams.add(words.slice(i, i + 2).join(' '));
  }

  // Also add individual significant words (4+ chars) for short content
  for (const word of words) {
    if (word.length >= 4) {
      ngrams.add(word);
    }
  }

  return ngrams;
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;

  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection++;
  }

  const union = a.size + b.size - intersection;
  return intersection / union;
}
