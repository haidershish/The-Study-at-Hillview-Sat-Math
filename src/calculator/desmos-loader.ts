/**
 * Official Desmos script loader.
 *
 * Loads https://www.desmos.com/api/v1.12/calculator.js exactly once per page
 * session. The complete script URL (which embeds the API key) is never logged.
 */

export const DESMOS_API_VERSION = '1.12';
const SCRIPT_ORIGIN = 'https://www.desmos.com';

export interface DesmosLoadResult {
  ok: boolean;
  reason?: 'invalid-api-key' | 'network-error' | 'timeout' | 'blocked';
}

export type DesmosScriptLoader = (apiKey: string) => Promise<DesmosLoadResult>;

function globalReady(): boolean {
  return typeof window !== 'undefined' && !!window.Desmos?.GraphingCalculator;
}

/**
 * Build the calculator.js URL. Kept as its own function so the caller never
 * has to assemble (and accidentally print) the URL with the key embedded.
 */
export function buildDesmosScriptUrl(apiKey: string): string {
  return `${SCRIPT_ORIGIN}/api/v${DESMOS_API_VERSION}/calculator.js?apiKey=${encodeURIComponent(apiKey)}`;
}

/**
 * The real loader. A module-level promise enforces "load exactly once": later
 * calls reuse the in-flight (or completed) result instead of re-injecting.
 */
let pending: Promise<DesmosLoadResult> | null = null;

export function loadDesmosScript(apiKey: string, timeoutMs = 12_000): Promise<DesmosLoadResult> {
  if (!pending) pending = injectScript(apiKey, timeoutMs);
  return pending;
}

function injectScript(apiKey: string, timeoutMs: number): Promise<DesmosLoadResult> {
  return new Promise<DesmosLoadResult>((resolve) => {
    // Already present (e.g. another embed loaded it).
    if (globalReady()) { resolve({ ok: true }); return; }

    const script = document.createElement('script');
    script.src = buildDesmosScriptUrl(apiKey);
    script.async = true;
    script.referrerPolicy = 'origin';

    let settled = false;
    const finish = (result: DesmosLoadResult): void => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(result);
    };

    const timer = window.setTimeout(() => finish({ ok: false, reason: 'timeout' }), timeoutMs);

    script.addEventListener('load', () => {
      finish(globalReady() ? { ok: true } : { ok: false, reason: 'invalid-api-key' });
    });
    script.addEventListener('error', () => finish({ ok: false, reason: 'network-error' }));

    document.head.appendChild(script);
  });
}

/** Test helper: reset the singleton (only used by unit tests). */
export function resetDesmosScriptState(): void {
  pending = null;
}
