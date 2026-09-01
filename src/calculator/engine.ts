import { all, create } from 'mathjs';

const math = create(all, {});
math.import({
  nCr: (n: number, r: number) => math.combinations(n, r),
  nPr: (n: number, r: number) => math.permutations(n, r),
}, { override: true });

const constants: Record<string, number> = { pi: Math.PI, e: Math.E };

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
  if (match) return match[1];
  if (!normalized.includes('=') && /x/i.test(normalized)) return normalized;
  return null;
}

export function evaluateExpression(source: string, scope: Record<string, number> = {}): number {
  const result = math.evaluate(normalizeExpression(source), { ...constants, ...scope });
  const numeric = typeof result === 'number' ? result : Number(result);
  if (!Number.isFinite(numeric)) throw new Error('Result is not a finite number.');
  return numeric;
}

export function formatNumber(value: number): string {
  if (Number.isInteger(value)) return String(value);
  if (Math.abs(value) >= 1e9 || (Math.abs(value) > 0 && Math.abs(value) < 1e-7)) return value.toExponential(8);
  return Number(value.toPrecision(12)).toString();
}

export function tableValues(source: string, start = -3, end = 3, step = 1): Array<{ x: number; y: number | null }> {
  const body = functionBody(source);
  if (!body) return [];
  const values: Array<{ x: number; y: number | null }> = [];
  for (let x = start; x <= end + step / 1000; x += step) {
    try { values.push({ x, y: evaluateExpression(body, { x }) }); }
    catch { values.push({ x, y: null }); }
  }
  return values;
}

export function isValidExpression(source: string): boolean {
  if (!source.trim()) return true;
  const body = functionBody(source);
  try { evaluateExpression(body ?? source, body ? { x: 1.2345 } : {}); return true; }
  catch { return false; }
}
