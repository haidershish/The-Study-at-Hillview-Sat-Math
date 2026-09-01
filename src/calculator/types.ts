/**
 * Calculator-provider abstraction.
 *
 * The SAT application talks to a graphing calculator only through this
 * interface. Concrete providers are:
 *   - DesmosCalculatorProvider  (official Desmos API, requires a valid API key + network)
 *   - OpenSourceCalculatorProvider (offline math.js + function-plot fallback)
 *
 * This keeps the rest of the application free of any dependency on Desmos
 * global objects (`window.Desmos`) so the open-source fallback can be swapped
 * in transparently.
 */

export type ProviderId = 'desmos' | 'open-source';

export type AngleMode = 'degrees' | 'radians';

/**
 * A single calculator expression. `latex` is the canonical Desmos syntax;
 * `source` is the optional open-source (math.js) equivalent used by the
 * fallback provider. When `source` is omitted the open-source provider must
 * decline to graph/evaluate the expression rather than guess.
 */
export interface CalculatorExpression {
  id: string;
  latex: string;
  source?: string;
  color?: string;
  visible?: boolean;
  /** Optional Desmos table definition (columns with values), Desmos-only. */
  columns?: Array<{ latex: string; values?: Array<number | string> }>;
}

/** Human-readable provider lifecycle status for the UI. */
export type ProviderStatus =
  | 'loading'
  | 'desmos'
  | 'open-source'
  | 'desmos-unavailable';

export interface ProviderInfo {
  /** Which provider is actually active. */
  id: ProviderId;
  /** The reported status (drives the status badge text). */
  status: ProviderStatus;
  /** Whether the provider is mounted and usable. */
  ready: boolean;
  /** Short human-readable label shown in the UI. */
  label: string;
  /** Longer explanation (e.g. why Desmos fell back). */
  detail: string;
  /** True when an API key was configured but Desmos could not load. */
  degraded: boolean;
}

export interface CalculatorProvider {
  readonly id: ProviderId;
  readonly ready: boolean;

  /** Render into `container` and initialize. Resolves when usable. */
  mount(container: HTMLElement): Promise<void>;
  /** Remove all DOM and release resources. Idempotent. */
  destroy(): void;

  /** Replace the entire expression list. */
  setExpressions(expressions: CalculatorExpression[]): void;
  /** Add one expression (creating a new id if necessary). */
  addExpression(expression: CalculatorExpression): void;
  /** Remove the expression with the given id. */
  removeExpression(id: string): void;
  /** Remove every expression. */
  clear(): void;

  /** Opaque serializable state (Desmos: getState() output). */
  getState(): unknown;
  /** Restore opaque serializable state. */
  setState(state: unknown): void;

  /** Re-measure after the container size changes. */
  resize(): void;
  /** Reset the viewport to a default window. */
  resetViewport(): void;
  /** Set trig angle mode. */
  setAngleMode(mode: AngleMode): void;
}
