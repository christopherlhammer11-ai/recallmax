import { Message } from './types';

/**
 * Parse various conversation formats into a unified Message array.
 * Supports:
 * - JSON array of {role, content} messages (OpenAI/Anthropic format)
 * - Markdown-style "### Role\nContent" format
 * - Plain text (treated as single user message)
 * - MEMORY.md style key-value format
 */
export function parseInput(input: string): Message[] {
  const trimmed = input.trim();

  // Try JSON first
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const messages = Array.isArray(parsed) ? parsed : [parsed];
      return messages.map(normalizeMessage).filter((m): m is Message => m !== null);
    } catch {
      // Not valid JSON, fall through
    }
  }

  // Try markdown conversation format: "### User", "### Assistant", etc.
  if (/^###?\s+(user|assistant|system|human|ai)/im.test(trimmed)) {
    return parseMarkdownConversation(trimmed);
  }

  // Try role-prefixed lines: "User: ...", "Assistant: ..."
  if (/^(user|assistant|system|human|ai)\s*:/im.test(trimmed)) {
    return parseRolePrefixed(trimmed);
  }

  // Plain text — treat as a single block of memory
  return [{ role: 'user', content: trimmed }];
}

function normalizeMessage(msg: Record<string, unknown>): Message | null {
  if (!msg || typeof msg !== 'object') return null;
  const role = String(msg.role || 'user').toLowerCase();
  const content = String(msg.content || '');
  if (!content.trim()) return null;
  return {
    role: normalizeRole(role),
    content: content.trim(),
    timestamp: msg.timestamp ? String(msg.timestamp) : undefined,
    name: msg.name ? String(msg.name) : undefined,
  };
}

function normalizeRole(role: string): string {
  const map: Record<string, string> = {
    human: 'user',
    ai: 'assistant',
    bot: 'assistant',
    model: 'assistant',
  };
  return map[role] || role;
}

function parseMarkdownConversation(text: string): Message[] {
  const messages: Message[] = [];
  const sections = text.split(/^###?\s+/m).filter(Boolean);

  for (const section of sections) {
    const newlineIdx = section.indexOf('\n');
    if (newlineIdx === -1) continue;
    const role = section.slice(0, newlineIdx).trim().toLowerCase();
    const content = section.slice(newlineIdx + 1).trim();
    if (!content) continue;
    messages.push({ role: normalizeRole(role), content });
  }

  return messages;
}

function parseRolePrefixed(text: string): Message[] {
  const messages: Message[] = [];
  const lines = text.split('\n');
  let currentRole = '';
  let currentContent: string[] = [];

  for (const line of lines) {
    const roleMatch = line.match(/^(user|assistant|system|human|ai)\s*:\s*(.*)/i);
    if (roleMatch) {
      if (currentRole && currentContent.length) {
        messages.push({
          role: normalizeRole(currentRole),
          content: currentContent.join('\n').trim(),
        });
      }
      currentRole = roleMatch[1].toLowerCase();
      currentContent = roleMatch[2] ? [roleMatch[2]] : [];
    } else {
      currentContent.push(line);
    }
  }

  if (currentRole && currentContent.length) {
    messages.push({
      role: normalizeRole(currentRole),
      content: currentContent.join('\n').trim(),
    });
  }

  return messages;
}
