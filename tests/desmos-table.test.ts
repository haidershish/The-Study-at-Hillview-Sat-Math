import { describe, expect, it } from 'vitest';
import { DESMOS_SAT_OPTIONS, toDesmosExpression } from '../src/calculator/desmos-provider';

describe('Desmos tables', () => {
  it('maps a table expression to a genuine Desmos table with x_1/y_1 columns', () => {
    const expression = toDesmosExpression({
      id: 't', latex: '',
      columns: [{ latex: 'x_1', values: [1, 2, 3] }, { latex: 'y_1', values: [4, 5, 6] }],
    });
    expect(expression.type).toBe('table');
    expect(expression.columns).toHaveLength(2);
    expect((expression.columns as Array<{ latex: string; values: string[] }>)[0]).toEqual({ latex: 'x_1', values: ['1', '2', '3'] });
    expect((expression.columns as Array<{ latex: string; values: string[] }>)[1]).toEqual({ latex: 'y_1', values: ['4', '5', '6'] });
  });

  it('applies the SAT-compatible restrictions', () => {
    expect(DESMOS_SAT_OPTIONS.images).toBe(false);
    expect(DESMOS_SAT_OPTIONS.folders).toBe(false);
    expect(DESMOS_SAT_OPTIONS.notes).toBe(false);
    expect(DESMOS_SAT_OPTIONS.forceLogModeRegressions).toBe(true);
  });
});
