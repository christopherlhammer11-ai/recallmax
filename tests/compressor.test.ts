import { compress, serializeMemory } from '../src/compressor';
import { Message, CompressedMemory } from '../src/types';

describe('compress', () => {
  it('compresses a basic conversation', () => {
    const messages: Message[] = [
      { role: 'user', content: 'Deploy the app to production' },
      { role: 'assistant', content: 'Deployed v2.1.0 to production at 14:30 UTC. The deployment succeeded with zero errors.' },
      { role: 'user', content: 'Great, thanks!' },
      { role: 'assistant', content: 'You\'re welcome! Let me know if you need anything else.' },
    ];

    const result = compress(messages);

    expect(result.metadata.messageCount).toBe(4);
    expect(result.metadata.originalTokens).toBeGreaterThan(0);
    expect(result.metadata.compressedTokens).toBeGreaterThan(0);
    expect(result.metadata.compressedTokens).toBeLessThanOrEqual(result.metadata.originalTokens);
    expect(result.metadata.compressionRatio).toBeGreaterThanOrEqual(0);
  });

  it('extracts decisions from conversation', () => {
    const messages: Message[] = [
      { role: 'user', content: 'Should we use PostgreSQL or MongoDB?' },
      { role: 'assistant', content: 'We decided to use PostgreSQL for relational data and switched to the Prisma ORM.' },
      { role: 'user', content: 'Sounds good, let\'s go with that approach.' },
    ];

    const result = compress(messages);
    expect(result.decisions.length).toBeGreaterThan(0);
    const allDecisions = result.decisions.join(' ').toLowerCase();
    expect(allDecisions).toContain('postgresql');
  });

  it('extracts errors', () => {
    const messages: Message[] = [
      { role: 'user', content: 'The build is failing' },
      { role: 'assistant', content: 'Found a TypeError in auth.ts line 42: Cannot read property "id" of null. Fixed by adding a null check.' },
    ];

    const result = compress(messages);
    expect(result.errors.length).toBeGreaterThan(0);
    const allErrors = result.errors.join(' ').toLowerCase();
    expect(allErrors).toContain('typeerror');
  });

  it('preserves system messages', () => {
    const messages: Message[] = [
      { role: 'system', content: 'You are a coding assistant. Always write TypeScript.' },
      { role: 'user', content: 'Hi there!' },
      { role: 'assistant', content: 'Hello! How can I help?' },
    ];

    const result = compress(messages);
    const allFacts = result.facts.join(' ');
    expect(allFacts).toContain('TypeScript');
  });

  it('drops filler content below threshold', () => {
    const messages: Message[] = [
      { role: 'user', content: 'ok' },
      { role: 'assistant', content: 'Sure!' },
      { role: 'user', content: 'thanks' },
      { role: 'assistant', content: 'No problem.' },
      { role: 'user', content: 'We need to migrate the database to PostgreSQL by Friday. The current MySQL setup has performance issues with joins over 10M rows.' },
    ];

    const result = compress(messages, { threshold: 0.3 });
    // The substantive message should survive, filler should be dropped
    const serialized = serializeMemory(result, 'prose');
    expect(serialized.toLowerCase()).toContain('postgresql');
  });

  it('respects maxTokens budget', () => {
    // Create a large conversation
    const messages: Message[] = [];
    for (let i = 0; i < 50; i++) {
      messages.push({
        role: 'user',
        content: `Task ${i}: We need to implement feature ${i} which requires changes to the authentication system, database schema, and frontend components. The deadline is next week.`,
      });
      messages.push({
        role: 'assistant',
        content: `Completed task ${i}. Made changes to auth.ts, schema.prisma, and UserProfile.tsx. Deployed to staging and all tests pass. The feature uses JWT tokens for session management.`,
      });
    }

    const result = compress(messages, { maxTokens: 200 });
    expect(result.metadata.compressedTokens).toBeLessThanOrEqual(250); // allow some slack
  });

  it('deduplicates repeated information', () => {
    const messages: Message[] = [
      { role: 'assistant', content: 'The server runs on port 3000 with Node.js 20.' },
      { role: 'assistant', content: 'The server is running on port 3000 using Node.js version 20.' },
      { role: 'assistant', content: 'Reminder: server runs on port 3000, Node.js 20.' },
    ];

    const result = compress(messages);
    // After dedup, should have fewer items than input messages
    const totalItems = result.facts.length + result.decisions.length +
      result.errors.length + result.openQuestions.length;
    expect(totalItems).toBeLessThan(3);
  });

  it('handles empty input', () => {
    const result = compress([]);
    expect(result.facts).toEqual([]);
    expect(result.decisions).toEqual([]);
    expect(result.errors).toEqual([]);
    expect(result.metadata.messageCount).toBe(0);
    expect(result.metadata.originalTokens).toBe(0);
  });
});

describe('serializeMemory', () => {
  const memory: CompressedMemory = {
    facts: ['Server runs on port 3000', 'Database is PostgreSQL'],
    decisions: ['Using TypeScript for all new code'],
    errors: ['Fixed null pointer in auth.ts'],
    openQuestions: ['Should we add rate limiting?'],
    summary: 'Building a web API with Express.',
    metadata: {
      originalTokens: 5000,
      compressedTokens: 200,
      compressionRatio: 0.96,
      messageCount: 50,
      timestamp: '2026-03-14T00:00:00.000Z',
    },
  };

  it('serializes to structured format', () => {
    const output = serializeMemory(memory, 'structured');
    expect(output).toContain('DECISIONS:');
    expect(output).toContain('FACTS:');
    expect(output).toContain('ERRORS/FIXES:');
    expect(output).toContain('OPEN QUESTIONS:');
    expect(output).toContain('96% compression');
  });

  it('serializes to markdown format', () => {
    const output = serializeMemory(memory, 'markdown');
    expect(output).toContain('# Compressed Memory');
    expect(output).toContain('## Decisions');
    expect(output).toContain('## Key Facts');
  });

  it('serializes to prose format', () => {
    const output = serializeMemory(memory, 'prose');
    expect(output).toContain('Key decisions:');
    expect(output).toContain('Known facts:');
    expect(output).not.toContain('#'); // No markdown headers
  });
});
