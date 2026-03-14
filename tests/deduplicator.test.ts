import { deduplicateChunks } from '../src/deduplicator';

describe('deduplicateChunks', () => {
  it('removes near-duplicate content', () => {
    const chunks = [
      'The server runs on port 3000 with Node.js 20',
      'The server is running on port 3000 using Node.js version 20',
      'Server runs on port 3000, Node.js 20',
    ];

    const result = deduplicateChunks(chunks);
    expect(result.length).toBeLessThan(chunks.length);
  });

  it('keeps distinct content', () => {
    const chunks = [
      'The database uses PostgreSQL with Prisma ORM',
      'Authentication is handled by JWT tokens with 24h expiry',
      'The frontend is built with Next.js and Tailwind CSS',
    ];

    const result = deduplicateChunks(chunks);
    expect(result.length).toBe(3);
  });

  it('prefers longer (more detailed) duplicates', () => {
    const chunks = [
      'Port 3000',
      'The server runs on port 3000 with Node.js 20 and Express framework',
    ];

    const result = deduplicateChunks(chunks);
    // Even if they're similar enough to dedup, the longer one should survive
    if (result.length === 1) {
      expect(result[0].length).toBeGreaterThan(10);
    }
  });

  it('handles empty array', () => {
    expect(deduplicateChunks([])).toEqual([]);
  });

  it('handles single item', () => {
    expect(deduplicateChunks(['only one'])).toEqual(['only one']);
  });
});
