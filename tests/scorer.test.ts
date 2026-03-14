import { scoreContent } from '../src/scorer';

describe('scoreContent', () => {
  it('scores decisions highly', () => {
    const result = scoreContent(
      'We decided to use PostgreSQL and switched to the Prisma ORM for database access.',
      'assistant',
    );
    expect(result.category).toBe('decision');
    expect(result.score).toBeGreaterThanOrEqual(0.7);
  });

  it('scores errors highly', () => {
    const result = scoreContent(
      'TypeError: Cannot read property "id" of null. Fixed by adding a null check in auth.ts.',
      'assistant',
    );
    expect(result.category).toBe('error');
    expect(result.score).toBeGreaterThanOrEqual(0.7);
  });

  it('scores facts moderately', () => {
    const result = scoreContent(
      'The server is running on port 3000 and uses Node.js version 20.',
      'assistant',
    );
    expect(result.score).toBeGreaterThanOrEqual(0.4);
  });

  it('scores filler low', () => {
    const result = scoreContent('ok', 'user');
    expect(result.score).toBeLessThanOrEqual(0.3);
  });

  it('boosts system messages', () => {
    const systemScore = scoreContent('You are a helpful assistant.', 'system');
    const userScore = scoreContent('You are a helpful assistant.', 'user');
    expect(systemScore.score).toBeGreaterThan(userScore.score);
  });

  it('boosts messages with code blocks', () => {
    const withCode = scoreContent(
      'Here is the fix:\n```typescript\nconst x = 1;\n```',
      'assistant',
    );
    const without = scoreContent('Here is the fix for the variable.', 'assistant');
    expect(withCode.score).toBeGreaterThanOrEqual(without.score);
  });

  it('detects questions', () => {
    const result = scoreContent(
      'How should we handle authentication for the API endpoints?',
      'user',
    );
    expect(result.category).toBe('question');
  });
});
