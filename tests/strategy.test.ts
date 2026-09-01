import { describe, expect, it } from 'vitest';
import { strategyAngleMode, strategyNeedsDesmos, strategyToExpressions } from '../src/questions/strategy';
import type { CalculatorStrategy } from '../src/types';

describe('calculator strategies', () => {
  const graphStrategy: CalculatorStrategy = {
    recommended: true,
    provider: 'either',
    expressions: [
      { latex: 'y=2x+1', source: 'y=2x+1', color: '#c74440' },
      { latex: 'y=11-x', source: 'y=11-x' },
    ],
    instructions: 'Graph both lines and read the intersection.',
  };

  it('converts strategy expressions to provider expressions', () => {
    const expressions = strategyToExpressions(graphStrategy);
    expect(expressions).toHaveLength(2);
    expect(expressions[0]).toMatchObject({ latex: 'y=2x+1', source: 'y=2x+1', visible: true });
  });

  it('a graph strategy with sources works on either provider', () => {
    expect(strategyNeedsDesmos(graphStrategy)).toBe(false);
  });

  it('a Desmos-only provider flag forces Desmos', () => {
    expect(strategyNeedsDesmos({ ...graphStrategy, provider: 'desmos' })).toBe(true);
  });

  it('an expression without a source requires Desmos', () => {
    const strategy: CalculatorStrategy = {
      recommended: true,
      provider: 'either',
      expressions: [{ latex: 'y=3x+k' }],
      instructions: 'Drag the slider.',
    };
    expect(strategyNeedsDesmos(strategy)).toBe(true);
  });

  it('a relation expression requires Desmos (circle)', () => {
    const strategy: CalculatorStrategy = {
      recommended: true,
      provider: 'either',
      expressions: [{ latex: '(x-2)^{2}+(y+5)^{2}=49', source: '(x-2)^2+(y+5)^2=49' }],
      instructions: 'Graph the circle.',
    };
    expect(strategyNeedsDesmos(strategy)).toBe(true);
  });

  it('a table requires Desmos and is emitted as a table expression', () => {
    const strategy: CalculatorStrategy = {
      recommended: true,
      provider: 'either',
      table: { columns: [{ latex: 'x_1', values: [0, 1, 2] }, { latex: 'y_1', values: [18, 22.2, 26.4] }] },
      instructions: 'Inspect the table.',
    };
    expect(strategyNeedsDesmos(strategy)).toBe(true);
    const expressions = strategyToExpressions(strategy);
    expect(expressions).toHaveLength(1);
    expect(expressions[0].columns).toHaveLength(2);
  });

  it('reads the angle mode', () => {
    expect(strategyAngleMode({ ...graphStrategy, angleMode: 'degrees' })).toBe('degrees');
    expect(strategyAngleMode(graphStrategy)).toBeUndefined();
  });
});
