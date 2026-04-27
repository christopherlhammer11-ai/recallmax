# RecallMax

**Long-term memory compression for AI agents.** RecallMax turns long conversations, notes, and project histories into compact memory records that can fit back into future agent context.

Demo: **Watch the demo:** [RecallMax Memory](https://christopherhammer.dev/assets/videos/narrated/project-demos/recallmax-memory-narrated.mp4)

## Who Uses It

- AI agents with conversations longer than one context window
- Coding agents that need to remember project decisions
- Customer support bots that need issue history
- Executive assistants that need preference and task memory
- Local-first AI tools that should avoid reloading every document every time

## What It Does

- Parses conversation-style input
- Scores messages by importance
- Preserves decisions, facts, errors, open questions, and constraints
- Filters filler and duplicate text
- Produces structured compressed memory
- Works without an LLM call

## Why It Matters

Agents do not become useful just because they can chat. They become useful when they remember the right things and forget the noise. RecallMax is the memory compression layer for that problem.

## Example

```ts
import { compressText } from 'recallmax';

const memory = compressText(longConversation, {
  maxTokens: 800,
});

console.log(memory.decisions);
console.log(memory.openQuestions);
```

## Quick Start

```bash
npm install
npm run build
npm test
```

CLI usage:

```bash
recallmax compress conversation.json --max-tokens 800
cat memory.md | recallmax compress --format markdown
```

## Portfolio Context

RecallMax supports the larger local-first agent story: HammerLock needs memory, Craig needs project continuity, and production agents need compressed context that survives beyond one session.

---

Built by **Christopher L. Hammer** - self-taught AI/product builder shipping local-first tools, demos, and real product surfaces.

- Portfolio: [christopherhammer.dev](https://christopherhammer.dev)
- Proof demos: [https://christopherhammer.dev#proof](https://christopherhammer.dev#proof)
- GitHub: [christopherlhammer11-ai](https://github.com/christopherlhammer11-ai)

