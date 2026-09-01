import { describe, expect, it } from 'vitest';
import { selectCalculatorProvider } from '../src/calculator/factory';
import type { CalculatorProvider } from '../src/calculator/types';

function stubProvider(id: 'desmos' | 'open-source'): CalculatorProvider {
  return {
    id,
    ready: true,
    mount: async () => {},
    destroy: () => {},
    setExpressions: () => {},
    addExpression: () => {},
    removeExpression: () => {},
    clear: () => {},
    getState: () => null,
    setState: () => {},
    resize: () => {},
    resetViewport: () => {},
    setAngleMode: () => {},
  };
}

describe('calculator provider selection', () => {
  it('falls back to open-source when no API key is configured', async () => {
    const { provider, info } = await selectCalculatorProvider({
      getApiKey: () => undefined,
    });
    expect(provider.id).toBe('open-source');
    expect(info.status).toBe('open-source');
    expect(info.degraded).toBe(false);
  });

  it('selects Desmos when the loader succeeds and the global is present', async () => {
    const { provider, info } = await selectCalculatorProvider({
      getApiKey: () => 'test-key',
      loadScript: async () => ({ ok: true }),
      hasDesmosGlobal: () => true,
      createDesmos: () => stubProvider('desmos'),
      createOpenSource: () => stubProvider('open-source'),
    });
    expect(provider.id).toBe('desmos');
    expect(info.status).toBe('desmos');
  });

  it('falls back when the key is rejected or expired', async () => {
    const { provider, info } = await selectCalculatorProvider({
      getApiKey: () => 'expired-key',
      loadScript: async () => ({ ok: false, reason: 'invalid-api-key' }),
      createOpenSource: () => stubProvider('open-source'),
    });
    expect(provider.id).toBe('open-source');
    expect(info.status).toBe('desmos-unavailable');
    expect(info.degraded).toBe(true);
    expect(info.detail).toMatch(/rejected|expired/i);
  });

  it('falls back on loader timeout', async () => {
    const { info } = await selectCalculatorProvider({
      getApiKey: () => 'test-key',
      loadScript: async () => ({ ok: false, reason: 'timeout' }),
      createOpenSource: () => stubProvider('open-source'),
    });
    expect(info.status).toBe('desmos-unavailable');
    expect(info.detail).toMatch(/timed out/i);
  });

  it('falls back on a script/network error', async () => {
    const { info } = await selectCalculatorProvider({
      getApiKey: () => 'test-key',
      loadScript: async () => ({ ok: false, reason: 'network-error' }),
      createOpenSource: () => stubProvider('open-source'),
    });
    expect(info.status).toBe('desmos-unavailable');
    expect(info.detail).toMatch(/offline/i);
  });

  it('falls back when the script loads but the Desmos global is missing', async () => {
    const { provider, info } = await selectCalculatorProvider({
      getApiKey: () => 'test-key',
      loadScript: async () => ({ ok: true }),
      hasDesmosGlobal: () => false,
      createDesmos: () => stubProvider('desmos'),
      createOpenSource: () => stubProvider('open-source'),
    });
    expect(provider.id).toBe('open-source');
    expect(info.status).toBe('desmos-unavailable');
  });
});
