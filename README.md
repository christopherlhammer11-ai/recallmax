# RecallMax

Memory compression for LLM agents. Takes conversation histories, memory files, or raw text and compresses them into dense, structured context that fits smaller windows.

No LLM calls. Pure algorithmic compression. Zero dependencies beyond `commander` for CLI.

## Install

```bash
npm install recallmax
```

## CLI Usage

```bash
# Compress a conversation file
recallmax compress conversation.json

# Pipe from stdin
cat memory.md | recallmax compress

# Target a specific token budget
recallmax compress chat.json --max-tokens 200

# Output formats: structured (default), markdown, prose
recallmax compress chat.json --format markdown

# Get raw JSON output
recallmax compress chat.json --json

# Check token stats without compressing
recallmax stats large-context.md
```

## Programmatic API

```typescript
import { compress, compressText, compressFile } from 'recallmax';

// From structured messages (OpenAI/Anthropic format)
const memory = compress([
  { role: 'user', content: 'Deploy to production' },
  { role: 'assistant', content: 'Deployed v2.1.0 to prod. Zero errors.' },
]);

// From raw text (auto-detects format)
const memory2 = compressText(`
User: Fix the auth bug
Assistant: Fixed null pointer in auth.ts line 42
User: thanks
Assistant: No problem!
`);

// From a file
const memory3 = await compressFile('./conversation.json');

// Access structured output
console.log(memory.decisions);    // ['Deployed v2.1.0 to prod']
console.log(memory.errors);       // []
console.log(memory.facts);        // [...]
console.log(memory.openQuestions); // []
console.log(memory.metadata);     // { originalTokens, compressedTokens, compressionRatio, ... }
```

## What It Does

1. **Parses** any conversation format (JSON messages, markdown, role-prefixed, plain text)
2. **Scores** every message by importance (decisions > errors > facts > questions > context > filler)
3. **Filters** out filler (greetings, acknowledgments, "ok", "thanks", etc.)
4. **Deduplicates** similar content using n-gram fingerprinting
5. **Condenses** text by removing filler phrases within kept messages
6. **Truncates** to fit your target token budget, prioritizing high-value content

## Output Format

```
DECISIONS:
- Migrating from MySQL to PostgreSQL using pgloader + Prisma
- Adding connection pooling with PgBouncer

FACTS:
- Database has 50 tables, 2M rows
- FK constraint on orders table

ERRORS/FIXES:
- Fixed FK constraint error by reordering migration steps

OPEN QUESTIONS:
- Should we update the API endpoints?

[10 messages | 170→193 tokens | 69% compression]
```

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `maxTokens` | 800 | Target max tokens for compressed output |
| `format` | `'structured'` | Output format: `structured`, `markdown`, `prose` |
| `threshold` | 0.3 | Importance threshold (0-1). Content below this is dropped |
| `preserveSystem` | `true` | Keep system messages verbatim |

## Supported Input Formats

- **JSON array**: `[{ "role": "user", "content": "..." }, ...]`
- **JSON object**: `{ "role": "user", "content": "..." }`
- **Role-prefixed**: `User: ...\nAssistant: ...`
- **Markdown headers**: `### User\n...\n### Assistant\n...`
- **Plain text**: Treated as a single block

## Genesis Marketplace

RecallMax is listed on the [Genesis Agent Marketplace](https://genesis-marketplace.vercel.app) as a free skill. Usage is optionally tracked for marketplace analytics (disable with `--no-telemetry`).

```bash
# Verify marketplace listing
recallmax verify
```

## License

MIT
