// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildDesmosScriptUrl, loadDesmosScript, resetDesmosScriptState } from '../src/calculator/desmos-loader';

interface FakeScript {
  src: string;
  async: boolean;
  referrerPolicy: string;
  addEventListener: (event: string, cb: () => void) => void;
  fire: (event: string) => void;
}

function makeScript(): FakeScript {
  const listeners: Record<string, Array<() => void>> = {};
  return {
    src: '',
    async: false,
    referrerPolicy: '',
    addEventListener: (event, cb) => { (listeners[event] ??= []).push(cb); },
    fire: (event) => { (listeners[event] ?? []).forEach(cb => cb()); },
  };
}

describe('Desmos script loader', () => {
  let script: FakeScript;

  beforeEach(() => {
    resetDesmosScriptState();
    vi.restoreAllMocks();
    vi.useFakeTimers();
    script = makeScript();
    vi.spyOn(document, 'createElement').mockReturnValue(script as unknown as HTMLElement);
    vi.spyOn(document.head, 'appendChild').mockImplementation(() => script as unknown as Node);
    delete (window as unknown as { Desmos?: unknown }).Desmos;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('builds the script URL with the key embedded', () => {
    expect(buildDesmosScriptUrl('abc123')).toBe('https://www.desmos.com/api/v1.12/calculator.js?apiKey=abc123');
  });

  it('resolves successfully when the script loads and the global appears', async () => {
    const promise = loadDesmosScript('test-key');
    (window as unknown as { Desmos: unknown }).Desmos = { GraphingCalculator: class {} };
    script.fire('load');
    await expect(promise).resolves.toEqual({ ok: true });
  });

  it('reports an invalid/rejected key when the global never appears', async () => {
    const promise = loadDesmosScript('bad-key');
    script.fire('load'); // script loaded but Desmos global absent -> invalid key
    await expect(promise).resolves.toEqual({ ok: false, reason: 'invalid-api-key' });
  });

  it('reports a network error on script error', async () => {
    const promise = loadDesmosScript('test-key');
    script.fire('error');
    await expect(promise).resolves.toEqual({ ok: false, reason: 'network-error' });
  });

  it('times out if the script never loads', async () => {
    const promise = loadDesmosScript('test-key');
    await vi.advanceTimersByTimeAsync(13_000);
    await expect(promise).resolves.toEqual({ ok: false, reason: 'timeout' });
  });

  it('loads the script exactly once (singleton)', () => {
    const first = loadDesmosScript('key-one');
    const second = loadDesmosScript('key-two');
    expect(second).toBe(first);
  });
});
