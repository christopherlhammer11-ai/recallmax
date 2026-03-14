import { Message, CompressedMemory, CompressOptions, ScoredChunk } from './types';
import { scoreContent } from './scorer';
import { deduplicateChunks } from './deduplicator';
import { estimateTokens, truncateToTokens } from './tokenizer';

const DEFAULT_OPTIONS: Required<CompressOptions> = {
  maxTokens: 800,
  preserveSystem: true,
  format: 'structured',
  threshold: 0.3,
};

/**
 * Compress a conversation history into a dense memory representation.
 * No LLM calls — pure algorithmic compression.
 */
export function compress(messages: Message[], options?: CompressOptions): CompressedMemory {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const originalText = messages.map(m => m.content).join('\n');
  const originalTokens = estimateTokens(originalText);

  // Step 1: Score every message
  const scored: ScoredChunk[] = [];
  for (const msg of messages) {
    // Preserve system messages if configured
    if (opts.preserveSystem && msg.role === 'system') {
      scored.push({
        content: msg.content,
        category: 'fact',
        score: 1.0,
        source: 'system',
      });
      continue;
    }

    const chunk = scoreContent(msg.content, msg.role);
    scored.push(chunk);
  }

  // Step 2: Filter by threshold
  const filtered = scored.filter(c => c.score >= opts.threshold);

  // Step 3: Categorize
  const facts: string[] = [];
  const decisions: string[] = [];
  const errors: string[] = [];
  const openQuestions: string[] = [];
  const contextChunks: string[] = [];

  for (const chunk of filtered) {
    const condensed = condense(chunk.content);
    switch (chunk.category) {
      case 'fact':
        facts.push(condensed);
        break;
      case 'decision':
        decisions.push(condensed);
        break;
      case 'error':
        errors.push(condensed);
        break;
      case 'question':
        openQuestions.push(condensed);
        break;
      default:
        contextChunks.push(condensed);
        break;
    }
  }

  // Step 4: Deduplicate within categories
  const dedupFacts = deduplicateChunks(facts);
  const dedupDecisions = deduplicateChunks(decisions);
  const dedupErrors = deduplicateChunks(errors);
  const dedupQuestions = deduplicateChunks(openQuestions);

  // Step 5: Build summary from context chunks
  const dedupContext = deduplicateChunks(contextChunks);
  const summary = dedupContext.join(' ').trim() || 'No additional context.';

  // Step 6: Token-aware truncation
  const result: CompressedMemory = {
    facts: dedupFacts,
    decisions: dedupDecisions,
    errors: dedupErrors,
    openQuestions: dedupQuestions,
    summary,
    metadata: {
      originalTokens,
      compressedTokens: 0, // calculated below
      compressionRatio: 0,
      messageCount: messages.length,
      timestamp: new Date().toISOString(),
    },
  };

  // Truncate if over budget
  const resultText = serializeMemory(result, opts.format);
  let compressedTokens = estimateTokens(resultText);

  if (compressedTokens > opts.maxTokens) {
    // Progressively trim from lowest-priority categories
    result.summary = truncateToTokens(result.summary, Math.floor(opts.maxTokens * 0.15));
    result.openQuestions = trimArray(result.openQuestions, Math.floor(opts.maxTokens * 0.1));
    result.errors = trimArray(result.errors, Math.floor(opts.maxTokens * 0.2));
    result.facts = trimArray(result.facts, Math.floor(opts.maxTokens * 0.25));
    result.decisions = trimArray(result.decisions, Math.floor(opts.maxTokens * 0.3));

    compressedTokens = estimateTokens(serializeMemory(result, opts.format));
  }

  result.metadata.compressedTokens = compressedTokens;
  result.metadata.compressionRatio = originalTokens > 0
    ? Math.max(0, Math.round((1 - compressedTokens / originalTokens) * 100) / 100)
    : 0;

  return result;
}

/**
 * Condense a text block: remove filler phrases, compress whitespace,
 * extract the core information.
 */
function condense(text: string): string {
  let result = text;

  // Remove common filler phrases
  const fillers = [
    /\b(basically|essentially|actually|literally|honestly|frankly)\b/gi,
    /\b(I think|I believe|I feel like|in my opinion|it seems like)\b/gi,
    /\b(just wanted to|I just want to|I'd like to|let me)\b/gi,
    /\b(as you know|as we know|as mentioned|as I mentioned|like I said)\b/gi,
    /\b(in order to|so that|such that)\b/gi,
    /\b(please note that|it should be noted that|it's worth noting)\b/gi,
    /\b(at the end of the day|at this point in time|going forward)\b/gi,
  ];

  for (const filler of fillers) {
    result = result.replace(filler, '');
  }

  // Collapse multiple spaces
  result = result.replace(/\s+/g, ' ').trim();

  // Remove empty parentheses/brackets left behind
  result = result.replace(/\(\s*\)/g, '').replace(/\[\s*\]/g, '');

  return result;
}

/**
 * Trim an array of strings to fit within a token budget.
 */
function trimArray(arr: string[], maxTokens: number): string[] {
  const result: string[] = [];
  let tokens = 0;

  for (const item of arr) {
    const itemTokens = estimateTokens(item);
    if (tokens + itemTokens > maxTokens) break;
    result.push(item);
    tokens += itemTokens;
  }

  return result;
}

/**
 * Serialize CompressedMemory into the requested format.
 */
export function serializeMemory(memory: CompressedMemory, format: string): string {
  switch (format) {
    case 'prose':
      return serializeProse(memory);
    case 'markdown':
      return serializeMarkdown(memory);
    case 'structured':
    default:
      return serializeStructured(memory);
  }
}

function serializeStructured(m: CompressedMemory): string {
  const sections: string[] = [];

  if (m.decisions.length) {
    sections.push(`DECISIONS:\n${m.decisions.map(d => `- ${d}`).join('\n')}`);
  }
  if (m.facts.length) {
    sections.push(`FACTS:\n${m.facts.map(f => `- ${f}`).join('\n')}`);
  }
  if (m.errors.length) {
    sections.push(`ERRORS/FIXES:\n${m.errors.map(e => `- ${e}`).join('\n')}`);
  }
  if (m.openQuestions.length) {
    sections.push(`OPEN QUESTIONS:\n${m.openQuestions.map(q => `- ${q}`).join('\n')}`);
  }
  if (m.summary && m.summary !== 'No additional context.') {
    sections.push(`CONTEXT:\n${m.summary}`);
  }

  sections.push(
    `[${m.metadata.messageCount} messages | ${m.metadata.originalTokens}→${m.metadata.compressedTokens} tokens | ${Math.round(m.metadata.compressionRatio * 100)}% compression]`
  );

  return sections.join('\n\n');
}

function serializeMarkdown(m: CompressedMemory): string {
  const sections: string[] = ['# Compressed Memory'];

  if (m.decisions.length) {
    sections.push(`## Decisions\n${m.decisions.map(d => `- ${d}`).join('\n')}`);
  }
  if (m.facts.length) {
    sections.push(`## Key Facts\n${m.facts.map(f => `- ${f}`).join('\n')}`);
  }
  if (m.errors.length) {
    sections.push(`## Errors & Fixes\n${m.errors.map(e => `- ${e}`).join('\n')}`);
  }
  if (m.openQuestions.length) {
    sections.push(`## Open Questions\n${m.openQuestions.map(q => `- ${q}`).join('\n')}`);
  }
  if (m.summary && m.summary !== 'No additional context.') {
    sections.push(`## Context\n${m.summary}`);
  }

  sections.push(
    `---\n*${m.metadata.messageCount} messages compressed from ${m.metadata.originalTokens} to ${m.metadata.compressedTokens} tokens (${Math.round(m.metadata.compressionRatio * 100)}% reduction)*`
  );

  return sections.join('\n\n');
}

function serializeProse(m: CompressedMemory): string {
  const parts: string[] = [];

  if (m.decisions.length) {
    parts.push(`Key decisions: ${m.decisions.join('. ')}.`);
  }
  if (m.facts.length) {
    parts.push(`Known facts: ${m.facts.join('. ')}.`);
  }
  if (m.errors.length) {
    parts.push(`Errors encountered: ${m.errors.join('. ')}.`);
  }
  if (m.openQuestions.length) {
    parts.push(`Unresolved: ${m.openQuestions.join('. ')}.`);
  }
  if (m.summary && m.summary !== 'No additional context.') {
    parts.push(m.summary);
  }

  return parts.join(' ');
}
