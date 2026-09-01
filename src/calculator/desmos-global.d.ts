/**
 * Minimal type surface for the official Desmos API (v1.12).
 * The script is loaded dynamically at runtime; it is never bundled or
 * self-hosted. See https://www.desmos.com/api/v1.12/docs/index.html
 */

export interface DesmosExpressionState {
  id?: string;
  latex?: string;
  color?: string;
  hidden?: boolean;
  secret?: boolean;
  type?: string;
  [key: string]: unknown;
}

export interface DesmosGraphState {
  degreeMode?: boolean;
  [key: string]: unknown;
}

export interface DesmosState {
  version?: number;
  graph?: DesmosGraphState;
  expressions?: { list?: DesmosExpressionState[]; [key: string]: unknown };
  [key: string]: unknown;
}

export interface DesmosCalculator {
  setExpression(expression: DesmosExpressionState): void;
  setExpressions(expressions: DesmosExpressionState[]): void;
  removeExpression(expression: { id: string }): void;
  removeExpressions(expressions: Array<{ id: string }>): void;
  getExpressions(): DesmosExpressionState[];
  setState(state: unknown, options?: { allowUndo?: boolean; remapColors?: boolean }): void;
  getState(): DesmosState;
  setBlank(options?: { allowUndo?: boolean }): void;
  setDefaultState(state: unknown): void;
  destroy(): void;
  resize(): void;
  setMathBounds(bounds: { left?: number; right?: number; bottom?: number; top?: number }): void;
  getMathBounds(): { left: number; right: number; bottom: number; top: number };
  observeEvent(eventName: string, callback: () => void): void;
  unobserveEvent(eventName: string): void;
  focusFirstExpression(): void;
}

export interface DesmosNamespace {
  GraphingCalculator: new (element: HTMLElement, options?: Record<string, unknown>) => DesmosCalculator;
}

declare global {
  interface Window {
    Desmos?: DesmosNamespace;
  }
}
