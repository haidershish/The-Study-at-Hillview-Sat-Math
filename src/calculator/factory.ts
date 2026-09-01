import type { CalculatorProvider, ProviderInfo } from './types';
import { OpenSourceCalculatorProvider } from './opensource-provider';
import { DesmosCalculatorProvider } from './desmos-provider';
import { loadDesmosScript, type DesmosScriptLoader } from './desmos-loader';

/**
 * Read the configured Desmos API key from the build environment. The key is
 * injected by Vite at build time from VITE_DESMOS_API_KEY (never committed).
 */
export function readConfiguredApiKey(): string | undefined {
  // Canonical Vite pattern: the build replaces import.meta.env.VITE_DESMOS_API_KEY
  // with the configured value (or undefined when absent).
  const value: string | undefined = import.meta.env.VITE_DESMOS_API_KEY;
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export interface SelectProviderDeps {
  getApiKey?: () => string | undefined;
  loadScript?: DesmosScriptLoader;
  hasDesmosGlobal?: () => boolean;
  createDesmos?: () => CalculatorProvider;
  createOpenSource?: () => CalculatorProvider;
  timeoutMs?: number;
}

export interface SelectedProvider {
  provider: CalculatorProvider;
  info: ProviderInfo;
}

function reasonMessage(reason?: string): string {
  switch (reason) {
    case 'invalid-api-key': return 'The Desmos API key was rejected or has expired, so the offline calculator is active.';
    case 'network-error': return 'Desmos could not be reached (you may be offline), so the offline calculator is active.';
    case 'timeout': return 'Loading Desmos timed out, so the offline calculator is active.';
    default: return 'Desmos is unavailable, so the offline calculator is active.';
  }
}

/**
 * Select the calculator provider.
 *
 *   - No API key -> open-source provider.
 *   - Key present -> attempt to load the official Desmos script exactly once;
 *     on success use Desmos, on any failure fall back to open-source and report
 *     a human-readable status.
 */
export async function selectCalculatorProvider(deps: SelectProviderDeps = {}): Promise<SelectedProvider> {
  const getApiKey = deps.getApiKey ?? readConfiguredApiKey;
  const loadScript = deps.loadScript ?? loadDesmosScript;
  const hasGlobal = deps.hasDesmosGlobal ?? (() => typeof window !== 'undefined' && !!window.Desmos?.GraphingCalculator);
  const createDesmos = deps.createDesmos ?? (() => new DesmosCalculatorProvider());
  const createOpenSource = deps.createOpenSource ?? (() => new OpenSourceCalculatorProvider());

  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      provider: createOpenSource(),
      info: {
        id: 'open-source', status: 'open-source', ready: true, degraded: false,
        label: 'Open-source offline calculator',
        detail: 'No Desmos API key is configured, so the offline calculator is active.',
      },
    };
  }

  const result = await loadScript(apiKey);
  if (result.ok && hasGlobal()) {
    return {
      provider: createDesmos(),
      info: {
        id: 'desmos', status: 'desmos', ready: true, degraded: false,
        label: 'Official Desmos calculator',
        detail: 'The official Desmos calculator loaded with the configured API key.',
      },
    };
  }

  return {
    provider: createOpenSource(),
    info: {
      id: 'open-source', status: 'desmos-unavailable', ready: true, degraded: true,
      label: 'Desmos unavailable — offline calculator active',
      detail: reasonMessage(result.reason),
    },
  };
}
