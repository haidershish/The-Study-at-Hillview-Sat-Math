import type { CalculatorStrategy } from '../types';
import type { AngleMode, CalculatorExpression } from '../calculator/types';
import { unsupportedRelation } from '../calculator/engine';

/** Convert a question's structured setup into provider-agnostic expressions. */
export function strategyToExpressions(strategy: CalculatorStrategy): CalculatorExpression[] {
  const expressions: CalculatorExpression[] = (strategy.expressions ?? []).map((expression, index) => ({
    id: expression.id ?? `strategy-${index + 1}`,
    latex: expression.latex,
    source: expression.source,
    color: expression.color,
    visible: true,
  }));
  if (strategy.table && strategy.table.columns.length > 0) {
    expressions.push({ id: 'strategy-table', latex: '', columns: strategy.table.columns });
  }
  return expressions;
}

export function strategyAngleMode(strategy: CalculatorStrategy): AngleMode | undefined {
  return strategy.angleMode;
}

/**
 * Whether a setup genuinely requires the official Desmos provider. A setup can
 * be served by the open-source fallback only when every expression carries an
 * explicit `source` string that is a plottable function and there is no table.
 */
export function strategyNeedsDesmos(strategy: CalculatorStrategy): boolean {
  if (strategy.provider === 'desmos') return true;
  if (strategy.table && strategy.table.columns.length > 0) return true;
  const expressions = strategy.expressions ?? [];
  if (expressions.length === 0) return false;
  return expressions.some(expression => {
    if (!expression.source) return true;
    return unsupportedRelation(expression.source) !== null;
  });
}
