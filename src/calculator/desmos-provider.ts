import type { AngleMode, CalculatorExpression, CalculatorProvider } from './types';
import type { DesmosCalculator, DesmosExpressionState } from './desmos-global';

/**
 * Official-Desmos provider. Requires `window.Desmos` to be available (loaded by
 * the factory via the loader). Talks to the calculator only through the public
 * Desmos API; the key never enters this class.
 *
 * Configuration flags were verified against the Desmos API v1.12 documentation:
 *   images:false, folders:false, notes:false, forceLogModeRegressions:true
 * are the documented, SAT-compatible restrictions.
 */
export const DESMOS_SAT_OPTIONS: Record<string, unknown> = {
  // College Board testing-style restrictions.
  images: false,
  folders: false,
  notes: false,
  forceLogModeRegressions: true,
  // Keep the full, familiar calculator chrome.
  keypad: true,
  graphpaper: true,
  expressions: true,
  settingsMenu: true,
  zoomButtons: true,
  expressionsTopbar: true,
  pointsOfInterest: true,
  trace: true,
  border: false,
  autosize: true,
};

export interface DesmosProviderOptions {
  onChange?: (state: unknown) => void;
}

export class DesmosCalculatorProvider implements CalculatorProvider {
  readonly id = 'desmos' as const;
  ready = false;

  private calculator: DesmosCalculator | null = null;
  private container: HTMLElement | null = null;
  private onChange?: (state: unknown) => void;

  constructor(options: DesmosProviderOptions = {}) {
    this.onChange = options.onChange;
  }

  async mount(container: HTMLElement): Promise<void> {
    if (this.calculator) return;
    const ns = window.Desmos;
    if (!ns?.GraphingCalculator) {
      throw new Error('The official Desmos calculator failed to initialize. Using the offline calculator instead.');
    }

    this.container = container;
    const host = document.createElement('div');
    host.className = 'desmos-host';
    host.setAttribute('aria-label', 'Desmos graphing calculator');
    container.replaceChildren(host);

    this.calculator = new ns.GraphingCalculator(host, { ...DESMOS_SAT_OPTIONS });
    this.calculator.observeEvent('change', () => this.onChange?.(this.calculator?.getState()));
    this.ready = true;
  }

  destroy(): void {
    if (this.calculator) {
      try { this.calculator.destroy(); } catch { /* already torn down */ }
      this.calculator = null;
    }
    this.container?.replaceChildren();
    this.ready = false;
  }

  setExpressions(expressions: CalculatorExpression[]): void {
    if (!this.calculator) return;
    this.calculator.setExpressions(expressions.map(toDesmosExpression));
  }

  addExpression(expression: CalculatorExpression): void {
    if (!this.calculator) return;
    this.calculator.setExpression(toDesmosExpression(expression));
  }

  removeExpression(id: string): void {
    if (!this.calculator) return;
    this.calculator.removeExpression({ id });
  }

  clear(): void {
    this.calculator?.setBlank();
  }

  getState(): unknown {
    return this.calculator?.getState() ?? null;
  }

  setState(state: unknown): void {
    if (this.calculator && state) this.calculator.setState(state);
  }

  resize(): void {
    this.calculator?.resize();
  }

  resetViewport(): void {
    // A neutral default window matching the open-source fallback's reset.
    this.calculator?.setMathBounds({ left: -10, right: 10, bottom: -10, top: 10 });
  }

  setAngleMode(mode: AngleMode): void {
    if (!this.calculator) return;
    const state = this.calculator.getState();
    if (!state) return;
    state.graph = { ...state.graph, degreeMode: mode === 'degrees' };
    this.calculator.setState(state);
  }
}

export function toDesmosExpression(expression: CalculatorExpression): DesmosExpressionState {
  const result: DesmosExpressionState = { id: expression.id, latex: expression.latex };
  if (expression.color) result.color = expression.color;
  if (expression.visible === false) result.hidden = true;
  if (expression.columns) {
    result.type = 'table';
    result.columns = expression.columns.map(column => ({
      latex: column.latex,
      values: (column.values ?? []).map(value => String(value)),
    }));
  }
  return result;
}
