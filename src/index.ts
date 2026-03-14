/**
 * RecallMax — Memory compression for LLM agents.
 *
 * @example
 * ```typescript
 * import { compress, compressText, compressFile } from 'recallmax';
 *
 * // From structured messages
 * const memory = compress([
 *   { role: 'user', content: 'Deploy to production' },
 *   { role: 'assistant', content: 'Deployed v2.1.0 to prod at 14:30 UTC' },
 * ]);
 *
 * // From raw text
 * const memory2 = compressText('User: fix the bug\nAssistant: Fixed null pointer in auth.ts line 42');
 *
 * // From a file
 * const memory3 = await compressFile('./conversation.json');
 * ```
 */

export { compress, serializeMemory } from './compressor';
export { parseInput } from './parser';
export { estimateTokens } from './tokenizer';
export { scoreContent } from './scorer';
export { deduplicateChunks } from './deduplicator';
export { trackUsage, verifyListing } from './marketplace';
export type { Message, CompressedMemory, CompressOptions, ScoredChunk, MarketplaceConfig } from './types';

import { compress, serializeMemory } from './compressor';
import { parseInput } from './parser';
import { CompressOptions, CompressedMemory } from './types';
import * as fs from 'fs';

/**
 * Compress raw text (any format — JSON messages, markdown, plain text).
 */
export function compressText(text: string, options?: CompressOptions): CompressedMemory {
  const messages = parseInput(text);
  return compress(messages, options);
}

/**
 * Compress a file's contents.
 */
export async function compressFile(
  filePath: string,
  options?: CompressOptions,
): Promise<CompressedMemory> {
  const content = await fs.promises.readFile(filePath, 'utf-8');
  return compressText(content, options);
}

/**
 * Compress and return formatted string output.
 */
export function compressToString(
  text: string,
  options?: CompressOptions & { format?: 'structured' | 'prose' | 'markdown' },
): string {
  const memory = compressText(text, options);
  return serializeMemory(memory, options?.format || 'structured');
}
