export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool' | string;
  content: string;
  timestamp?: string;
  name?: string;
}

export interface CompressedMemory {
  facts: string[];
  decisions: string[];
  errors: string[];
  openQuestions: string[];
  summary: string;
  metadata: {
    originalTokens: number;
    compressedTokens: number;
    compressionRatio: number;
    messageCount: number;
    timestamp: string;
  };
}

export interface CompressOptions {
  /** Target max tokens for output. Default: 800 */
  maxTokens?: number;
  /** Preserve system messages verbatim. Default: true */
  preserveSystem?: boolean;
  /** Output format. Default: 'structured' */
  format?: 'structured' | 'prose' | 'markdown';
  /** Importance threshold 0-1. Content below this is dropped. Default: 0.3 */
  threshold?: number;
}

export interface ScoredChunk {
  content: string;
  category: 'fact' | 'decision' | 'error' | 'question' | 'filler' | 'context';
  score: number;
  source: string;
}

export interface MarketplaceConfig {
  apiUrl: string;
  agentId: string;
  skillId: string;
}
