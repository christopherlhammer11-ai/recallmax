#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import { compressText, compressFile } from './index';
import { serializeMemory } from './compressor';
import { estimateTokens } from './tokenizer';
import { trackUsage } from './marketplace';

const program = new Command();

program
  .name('recallmax')
  .description('Memory compression for LLM agents')
  .version('0.1.0');

program
  .command('compress')
  .description('Compress a conversation or memory file')
  .argument('[file]', 'Input file (JSON, markdown, or plain text). Reads stdin if omitted.')
  .option('-t, --max-tokens <n>', 'Target max tokens for output', '800')
  .option('-f, --format <type>', 'Output format: structured, prose, markdown', 'structured')
  .option('--threshold <n>', 'Importance threshold 0-1 (lower keeps more)', '0.3')
  .option('--json', 'Output raw JSON instead of formatted text')
  .option('--no-telemetry', 'Disable usage tracking')
  .action(async (file: string | undefined, opts: Record<string, string | boolean>) => {
    try {
      let input: string;

      if (file) {
        if (!fs.existsSync(file)) {
          console.error(`Error: File not found: ${file}`);
          process.exit(1);
        }
        input = fs.readFileSync(file, 'utf-8');
      } else if (!process.stdin.isTTY) {
        // Read from stdin
        input = await readStdin();
      } else {
        console.error('Error: Provide a file argument or pipe input via stdin.');
        console.error('  recallmax compress conversation.json');
        console.error('  cat memory.md | recallmax compress');
        process.exit(1);
      }

      const options = {
        maxTokens: parseInt(opts['maxTokens'] as string, 10) || 800,
        format: (opts['format'] as 'structured' | 'prose' | 'markdown') || 'structured',
        threshold: parseFloat(opts['threshold'] as string) || 0.3,
      };

      const memory = compressText(input, options);

      if (opts['json']) {
        console.log(JSON.stringify(memory, null, 2));
      } else {
        console.log(serializeMemory(memory, options.format));
      }

      // Track usage (non-blocking)
      if (opts['telemetry'] !== false) {
        trackUsage('compress', {
          inputTokens: memory.metadata.originalTokens,
          outputTokens: memory.metadata.compressedTokens,
          format: options.format,
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Compression failed:', (err as Error).message);
      process.exit(1);
    }
  });

program
  .command('stats')
  .description('Show token stats for a file without compressing')
  .argument('<file>', 'Input file')
  .action((file: string) => {
    if (!fs.existsSync(file)) {
      console.error(`Error: File not found: ${file}`);
      process.exit(1);
    }

    const content = fs.readFileSync(file, 'utf-8');
    const tokens = estimateTokens(content);
    const lines = content.split('\n').length;
    const chars = content.length;

    console.log(`File: ${file}`);
    console.log(`Characters: ${chars.toLocaleString()}`);
    console.log(`Lines: ${lines.toLocaleString()}`);
    console.log(`Estimated tokens: ${tokens.toLocaleString()}`);
    console.log(`At 800 token target: ${Math.round((1 - 800 / tokens) * 100)}% compression needed`);
  });

program
  .command('verify')
  .description('Check if RecallMax is listed on Genesis Marketplace')
  .action(async () => {
    const { verifyListing } = await import('./marketplace');
    const listed = await verifyListing();
    if (listed) {
      console.log('RecallMax is live on Genesis Marketplace');
    } else {
      console.log('RecallMax listing not found (marketplace may be unreachable)');
    }
  });

program.parse();

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', chunk => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);

    // Timeout after 5s of no input
    setTimeout(() => {
      if (!data) reject(new Error('No input received on stdin'));
    }, 5000);
  });
}
