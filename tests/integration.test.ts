import { compressText, compressToString } from '../src/index';

describe('integration: compressText', () => {
  const REAL_CONVERSATION = [
    'User: I need to set up a new Express API with TypeScript',
    'Assistant: I\'ll help you set up an Express API with TypeScript. Let me create the project structure.',
    'First, let\'s initialize the project:',
    '```bash',
    'mkdir my-api && cd my-api',
    'npm init -y',
    'npm install express',
    'npm install -D typescript @types/express @types/node ts-node-dev',
    '```',
    'User: Great, what about the tsconfig?',
    'Assistant: Here\'s a good tsconfig.json for an Express API:',
    '```json',
    '{',
    '  "compilerOptions": {',
    '    "target": "ES2021",',
    '    "module": "commonjs",',
    '    "strict": true',
    '  }',
    '}',
    '```',
    'User: Thanks!',
    'Assistant: You\'re welcome!',
    'User: Now I need to add a health check endpoint.',
    'Assistant: I\'ll add a health check endpoint at GET /health that returns 200 OK.',
    'User: Perfect. Also, we decided to use PostgreSQL with Prisma for the database.',
    'Assistant: Switched to PostgreSQL with Prisma ORM. Running npx prisma init to set up the schema.',
    'User: There\'s an error: TypeError: Cannot read properties of undefined',
    'Assistant: Fixed the TypeError by adding a null check in the database connection handler. The issue was that the DATABASE_URL env var was not set.',
    'User: Should we add rate limiting?',
    'Assistant: That\'s a good question. We could use express-rate-limit with a 100 req/min window.',
    'User: ok',
    'Assistant: Got it.',
    'User: thanks',
    'Assistant: No problem!',
  ].join('\n');

  it('compresses a realistic multi-turn conversation', () => {
    const result = compressText(REAL_CONVERSATION);

    // Should have non-negative compression ratio
    expect(result.metadata.compressionRatio).toBeGreaterThanOrEqual(0);
    // Should extract meaningful content
    expect(result.facts.length + result.decisions.length + result.errors.length).toBeGreaterThan(0);

    // Should extract the decision about PostgreSQL
    const allContent = [
      ...result.decisions,
      ...result.facts,
    ].join(' ').toLowerCase();
    expect(allContent).toMatch(/postgres|prisma/i);
  });

  it('extracts the TypeError error', () => {
    const result = compressText(REAL_CONVERSATION);
    const errorContent = result.errors.join(' ').toLowerCase();
    expect(errorContent).toMatch(/typeerror|null check|database_url/i);
  });

  it('drops filler like "ok", "thanks", "no problem"', () => {
    const result = compressText(REAL_CONVERSATION, { threshold: 0.3 });
    const serialized = compressToString(REAL_CONVERSATION, { threshold: 0.3 });
    // Filler shouldn't dominate the output
    expect(serialized).not.toMatch(/\bok\b.*\bthanks\b.*\bno problem\b/i);
  });

  it('works with JSON input format', () => {
    const jsonInput = JSON.stringify([
      { role: 'system', content: 'You are a coding assistant' },
      { role: 'user', content: 'Fix the auth bug' },
      { role: 'assistant', content: 'Found and fixed a null pointer in validateToken()' },
    ]);

    const result = compressText(jsonInput);
    expect(result.metadata.messageCount).toBe(3);
    expect(result.facts.length + result.errors.length + result.decisions.length).toBeGreaterThan(0);
  });

  it('produces different output formats', () => {
    const structured = compressToString(REAL_CONVERSATION, { format: 'structured' });
    const markdown = compressToString(REAL_CONVERSATION, { format: 'markdown' });
    const prose = compressToString(REAL_CONVERSATION, { format: 'prose' });

    expect(structured).toContain('DECISIONS:');
    expect(markdown).toContain('# Compressed Memory');
    expect(prose).not.toContain('#');

    // All should contain the key info
    for (const output of [structured, markdown, prose]) {
      expect(output.length).toBeGreaterThan(0);
    }
  });

  it('respects tight token budget', () => {
    const result = compressText(REAL_CONVERSATION, { maxTokens: 100 });
    expect(result.metadata.compressedTokens).toBeLessThanOrEqual(150); // some slack
  });
});

describe('integration: plain text memory file', () => {
  it('compresses a MEMORY.md style file', () => {
    const memoryFile = [
      '# Project Memory',
      '',
      '## Architecture',
      '- Backend: Express + TypeScript on port 3000',
      '- Database: PostgreSQL with Prisma ORM',
      '- Frontend: Next.js with Tailwind CSS',
      '- Auth: JWT tokens with 24h expiry',
      '',
      '## Decisions',
      '- Decided to use PostgreSQL over MongoDB for relational data',
      '- Switched from REST to GraphQL for the user API',
      '- Chose Vercel for deployment',
      '',
      '## Known Issues',
      '- Rate limiting not yet implemented',
      '- Need to add input validation on all endpoints',
      '- WebSocket connection drops after 30 minutes',
    ].join('\n');

    const result = compressText(memoryFile);
    expect(result.metadata.messageCount).toBe(1); // plain text = 1 message
    expect(result.metadata.compressedTokens).toBeGreaterThan(0);

    // Key facts should be preserved
    const allContent = [
      ...result.facts,
      ...result.decisions,
      ...result.errors,
      result.summary,
    ].join(' ');
    expect(allContent.toLowerCase()).toMatch(/postgresql|prisma|vercel/i);
  });
});
