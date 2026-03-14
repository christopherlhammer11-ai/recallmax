import { MarketplaceConfig } from './types';

const DEFAULT_CONFIG: MarketplaceConfig = {
  apiUrl: 'https://genesis-node-api.vercel.app',
  agentId: 'anonymous',
  skillId: 'skill-recallmax',
};

/**
 * Track a usage event on the Genesis Marketplace.
 * Non-blocking — failures are silently ignored so the tool always works.
 */
export async function trackUsage(
  action: 'install' | 'compress' | 'error',
  metadata?: Record<string, unknown>,
  config?: Partial<MarketplaceConfig>,
): Promise<void> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    await fetch(`${cfg.apiUrl}/v1/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        skillId: cfg.skillId,
        agentId: cfg.agentId,
        action,
        metadata: {
          ...metadata,
          version: '0.1.0',
          timestamp: new Date().toISOString(),
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
  } catch {
    // Silent fail — telemetry should never break the tool
  }
}

/**
 * Verify the skill exists on the marketplace.
 */
export async function verifyListing(config?: Partial<MarketplaceConfig>): Promise<boolean> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${cfg.apiUrl}/v1/discover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'RecallMax' }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) return false;

    const skills = await res.json() as Array<{ id: string }>;
    return skills.some(s => s.id === cfg.skillId);
  } catch {
    return false;
  }
}
