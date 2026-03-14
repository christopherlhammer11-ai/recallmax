import { parseInput } from '../src/parser';

describe('parseInput', () => {
  it('parses JSON message array', () => {
    const input = JSON.stringify([
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there' },
    ]);

    const messages = parseInput(input);
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('user');
    expect(messages[1].role).toBe('assistant');
  });

  it('parses single JSON message object', () => {
    const input = JSON.stringify({ role: 'user', content: 'Test message' });
    const messages = parseInput(input);
    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe('Test message');
  });

  it('normalizes role names', () => {
    const input = JSON.stringify([
      { role: 'human', content: 'From human' },
      { role: 'ai', content: 'From AI' },
      { role: 'bot', content: 'From bot' },
    ]);

    const messages = parseInput(input);
    expect(messages[0].role).toBe('user');
    expect(messages[1].role).toBe('assistant');
    expect(messages[2].role).toBe('assistant');
  });

  it('parses role-prefixed format', () => {
    const input = `User: What's the weather?
Assistant: I don't have access to weather data.
User: Ok, can you help with code instead?
Assistant: Of course! What do you need?`;

    const messages = parseInput(input);
    expect(messages).toHaveLength(4);
    expect(messages[0].role).toBe('user');
    expect(messages[0].content).toBe("What's the weather?");
    expect(messages[1].role).toBe('assistant');
  });

  it('parses markdown conversation format', () => {
    const input = `### User
Deploy to production

### Assistant
Deployed v2.1.0 successfully.

### User
Run the tests`;

    const messages = parseInput(input);
    expect(messages).toHaveLength(3);
    expect(messages[0].role).toBe('user');
    expect(messages[0].content).toBe('Deploy to production');
  });

  it('handles plain text as single message', () => {
    const input = 'This is just some plain text about the project.';
    const messages = parseInput(input);
    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe('user');
    expect(messages[0].content).toBe(input);
  });

  it('skips empty messages', () => {
    const input = JSON.stringify([
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: '' },
      { role: 'user', content: 'World' },
    ]);

    const messages = parseInput(input);
    expect(messages).toHaveLength(2);
  });

  it('handles multiline content in role-prefixed format', () => {
    const input = `User: Here's my code:
function add(a, b) {
  return a + b;
}
Can you review it?
Assistant: The function looks correct.`;

    const messages = parseInput(input);
    expect(messages).toHaveLength(2);
    expect(messages[0].content).toContain('function add');
    expect(messages[0].content).toContain('Can you review it?');
  });
});
