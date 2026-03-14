import { estimateTokens, truncateToTokens } from '../src/tokenizer';

describe('estimateTokens', () => {
  it('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('counts single words', () => {
    expect(estimateTokens('hello')).toBe(2); // 5 chars / 4 = ceil(1.25) = 2
  });

  it('estimates reasonable token counts for sentences', () => {
    const text = 'The quick brown fox jumps over the lazy dog';
    const tokens = estimateTokens(text);
    // 9 words, most are short — should be roughly 9-15 tokens
    expect(tokens).toBeGreaterThanOrEqual(9);
    expect(tokens).toBeLessThanOrEqual(20);
  });

  it('handles long technical text', () => {
    const text = 'TypeError: Cannot read properties of undefined (reading "id") at AuthService.validateToken (auth.service.ts:42:15)';
    const tokens = estimateTokens(text);
    expect(tokens).toBeGreaterThan(10);
  });
});

describe('truncateToTokens', () => {
  it('returns full text when under budget', () => {
    const text = 'short text';
    expect(truncateToTokens(text, 100)).toBe(text);
  });

  it('truncates long text to fit budget', () => {
    const words = Array.from({ length: 100 }, (_, i) => `word${i}`);
    const text = words.join(' ');
    const result = truncateToTokens(text, 10);
    const resultTokens = estimateTokens(result);
    expect(resultTokens).toBeLessThanOrEqual(10);
  });

  it('handles empty string', () => {
    expect(truncateToTokens('', 10)).toBe('');
  });
});
