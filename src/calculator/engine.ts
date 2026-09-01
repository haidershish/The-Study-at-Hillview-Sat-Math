import { all, create, type MathJsInstance } from 'mathjs';
import type { AngleMode } from './types';

const math: MathJsInstance = create(all, {});

// SAT combinatorics aliases shared by both angle-mode instances.
const combinatorics = {
  nCr: (n: number, r: number) => math.combinations(n, r),
  nPr: (n: number, r: number) => math.permutations(n, r),
};

// Desmos-compatible list/statistics aliases for the open-source fallback.
const statistics = {
  total: (values: any) => math.sum(values),
  length: (values: any) => {
    const arr = Array.isArray(values)
      ? values
      : (values && typeof values.toArray === 'function' ? values.toArray() : [values]);
    return arr.length;
  },
  stdev: (values: any) => (math.std as (v: unknown, n?: string) => number)(values),
  stdevp: (values: any) => (math.std as (v: unknown, n?: string) => number)(values, 'uncorrected'),
};

math.import({ ...combinatorics, ...statistics }, { override: true });

const toRadians = (value: number): number => (value * Math.PI) / 180;
const toDegrees = (value: number): number => (value * 180) / Math.PI;

// A second instance whose trig functions assume degree arguments.
const mathDegrees: MathJsInstance = create(all, {});
mathDegrees.import({
  ...combinatorics,
  ...statistics,
  sin: (x: number) => math.sin(toRadians(x)),
  cos: (x: number) => math.cos(toRadians(x)),
  tan: (x: number) => math.tan(toRadians(x)),
  sec: (x: number) => 1 / math.cos(toRadians(x)),
  csc: (x: number) => 1 / math.sin(toRadians(x)),
  cot: (x: number) => 1 / math.tan(toRadians(x)),
  asin: (x: number) => toDegrees(math.asin(x) as number),
  acos: (x: number) => toDegrees(math.acos(x) as number),
  atan: (x: number) => toDegrees(math.atan(x) as number),
}, { override: true });

const constants: Record<string, number> = { pi: Math.PI, e: Math.E };

const instanceFor = (mode: AngleMode): MathJsInstance => (mode === 'degrees' ? mathDegrees : math);

export function normalizeExpression(raw: string): string {
  let value = raw.trim()
    .replace(/[−–]/g, '-')
    .replace(/π/g, 'pi')
    .replace(/(?:\\)?sqrt\{([^{}]+)\}/g, 'sqrt($1)')
    .replace(/√\s*\(/g, 'sqrt(')
    .replace(/\^\{/g, '^(')
    .replace(/\}/g, ')')
    .replace(/\\cdot|×/g, '*')
    .replace(/÷/g, '/')
    .replace(/\bln\b/g, 'log');
  value = value.replace(/(\d|\)|pi)\s*(x|\()/gi, '$1*$2');
  return value;
}

export function functionBody(source: string): string | null {
  const normalized = normalizeExpression(source);
  const match = normalized.match(/^\s*(?:y|f\s*\(\s*x\s*\))\s*=\s*(.+)$/i);
  if (match) {
    const body = match[1];
    // Reject relation operators hiding inside the body (restrictions, piecewise).
    if (/[<>~{}]/.test(body)) return null;
    return body;
  }
  // A bare expression in x is only a valid function if it has no relation
  // operators at all (no "=", "<", ">", "~", "{", "}").
  if (/[<>=~{}]/.test(normalized)) return null;
  if (/x/i.test(normalized)) return normalized;
  return null;
}

export function evaluateExpression(source: string, scope: Record<string, number> = {}, angleMode: AngleMode = 'radians'): number {
  const result = instanceFor(angleMode).evaluate(normalizeExpression(source), { ...constants, ...scope });
  const numeric = typeof result === 'number' ? result : Number(result);
  if (!Number.isFinite(numeric)) throw new Error('Result is not a finite number.');
  return numeric;
}

export function formatNumber(value: number): string {
  if (Number.isInteger(value)) return String(value);
  if (Math.abs(value) >= 1e9 || (Math.abs(value) > 0 && Math.abs(value) < 1e-7)) return value.toExponential(8);
  return Number(value.toPrecision(12)).toString();
}

export function tableValues(source: string, start = -3, end = 3, step = 1, angleMode: AngleMode = 'radians'): Array<{ x: number; y: number | null }> {
  const body = functionBody(source);
  if (!body) return [];
  const values: Array<{ x: number; y: number | null }> = [];
  for (let x = start; x <= end + step / 1000; x += step) {
    try { values.push({ x, y: evaluateExpression(body, { x }, angleMode) }); }
    catch { values.push({ x, y: null }); }
  }
  return values;
}

export function isValidExpression(source: string, angleMode: AngleMode = 'radians'): boolean {
  if (!source.trim()) return true;
  const body = functionBody(source);
  try { evaluateExpression(body ?? source, body ? { x: 1.2345 } : {}, angleMode); return true; }
  catch { return false; }
}

/** Report whether an expression is a relation the open-source fallback cannot graph. */
export function unsupportedRelation(source: string): string | null {
  const value = normalizeExpression(source);
  if (/~/.test(value)) return 'regression';
  if (/[{}]/.test(value)) return 'restriction-or-piecewise';
  if (/[<>]/.test(value)) return 'inequality';
  // An "=" that is not a leading y= / f(x)= assignment means an implicit equation
  // (e.g. a circle), which function-plot cannot render.
  if (value.includes('=') && !/^\s*(?:y|f\s*\(\s*x\s*\))\s*=/.test(value)) return 'implicit-equation';
  return null;
}
