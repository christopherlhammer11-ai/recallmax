import { ScoredChunk } from './types';

/**
 * Patterns that indicate high-value content worth preserving.
 */
const DECISION_PATTERNS = [
  /\b(decided|chose|picked|selected|went with|switched to|using|adopted|migrated)\b/i,
  /\b(will|going to|plan to|need to|must|should|let's)\b/i,
  /\b(approved|rejected|denied|accepted|confirmed)\b/i,
  /\b(changed from .+ to|replaced .+ with|updated .+ to)\b/i,
];

const ERROR_PATTERNS = [
  /\b(error|bug|fail|crash|broke|broken|exception|issue|problem)\b/i,
  /\b(fix|fixed|resolved|solved|patched|workaround)\b/i,
  /\b(TypeError|ReferenceError|SyntaxError|RuntimeError|ENOENT|EACCES|404|500|401|403)\b/i,
  /\bstack\s*trace\b/i,
  /\b(warning|warn|deprecated)\b/i,
];

const FACT_PATTERNS = [
  /\b(is|are|was|were|has|have|contains|located at|stored in|runs on|uses)\b/i,
  /\b(version|v\d+|port \d+|pid \d+)\b/i,
  /\b(password|key|token|secret|credential|api[_-]?key)\b/i,
  /\b(url|endpoint|path|directory|file)\b:\s/i,
  /https?:\/\/\S+/i,
  /\b[A-Z][a-z]+(?:[A-Z][a-z]+)+\b/, // CamelCase identifiers
  /`[^`]+`/, // Inline code
];

const QUESTION_PATTERNS = [
  /\?\s*$/,
  /\b(how|what|why|where|when|which|who|should|could|would)\b.*\?/i,
  /\b(todo|tbd|tbc|open question|needs? (?:to be |)(?:decided|resolved|clarified))\b/i,
];

/**
 * Filler patterns that indicate low-value content.
 */
const FILLER_PATTERNS = [
  /^(hi|hello|hey|thanks|thank you|sure|ok|okay|great|nice|cool|awesome|perfect|got it|sounds good|no problem|you're welcome|np)\s*[.!]?\s*$/i,
  /^(let me|i'll|i will|i'm going to|allow me to)\s+(know|help|check|look|see|think|try)/i,
  /\b(just to clarify|as mentioned|as i said|like i said|as we discussed)\b/i,
  /^(yes|no|yep|nope|yeah|nah)\s*[.!,]?\s*$/i,
  /^\s*(\.{3}|---+|\*{3})\s*$/,
];

export function scoreContent(text: string, role: string): ScoredChunk {
  // Split into sentences for granular scoring
  const sentences = splitSentences(text);
  let totalScore = 0;
  let bestCategory: ScoredChunk['category'] = 'context';
  const categoryCounts = { decision: 0, error: 0, fact: 0, question: 0, filler: 0, context: 0 };

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    // Check filler first — if the whole message is filler, score it low
    if (FILLER_PATTERNS.some(p => p.test(trimmed))) {
      categoryCounts.filler++;
      continue;
    }

    // Score by category
    const decisionScore = DECISION_PATTERNS.filter(p => p.test(trimmed)).length;
    const errorScore = ERROR_PATTERNS.filter(p => p.test(trimmed)).length;
    const factScore = FACT_PATTERNS.filter(p => p.test(trimmed)).length;
    const questionScore = QUESTION_PATTERNS.filter(p => p.test(trimmed)).length;

    if (decisionScore > 0) categoryCounts.decision += decisionScore;
    if (errorScore > 0) categoryCounts.error += errorScore;
    if (factScore > 0) categoryCounts.fact += factScore;
    if (questionScore > 0) categoryCounts.question += questionScore;
    if (decisionScore + errorScore + factScore + questionScore === 0) {
      categoryCounts.context++;
    }
  }

  // Determine dominant category
  const maxCategory = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])[0];

  bestCategory = maxCategory[0] as ScoredChunk['category'];

  // Calculate score based on category weights
  const weights = {
    decision: 1.0,
    error: 0.9,
    fact: 0.7,
    question: 0.6,
    context: 0.4,
    filler: 0.1,
  };

  totalScore = weights[bestCategory];

  // Boost system messages
  if (role === 'system') totalScore = Math.min(1.0, totalScore + 0.3);

  // Boost messages with code blocks
  if (/```[\s\S]+```/.test(text)) totalScore = Math.min(1.0, totalScore + 0.2);

  // Boost messages with URLs or file paths
  if (/https?:\/\/\S+/.test(text) || /\/[\w/.-]+\.\w+/.test(text)) {
    totalScore = Math.min(1.0, totalScore + 0.1);
  }

  // Length penalty for very short content (likely filler)
  if (text.length < 20) totalScore *= 0.5;

  // Length bonus for substantive content
  if (text.length > 200) totalScore = Math.min(1.0, totalScore + 0.1);

  return {
    content: text,
    category: bestCategory,
    score: Math.round(totalScore * 100) / 100,
    source: role,
  };
}

function splitSentences(text: string): string[] {
  // Split on sentence boundaries, but not inside code blocks or URLs
  return text
    .replace(/```[\s\S]*?```/g, match => match.replace(/\./g, '\u0000'))
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map(s => s.replace(/\u0000/g, '.'));
}
