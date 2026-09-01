import { describe, expect, it } from 'vitest';
import { OpenSourceCalculatorProvider } from '../src/calculator/opensource-provider';
import type { CalculatorExpression } from '../src/calculator/types';

describe('open-source provider state', () => {
  it('round-trips expressions through getState/setState', () => {
    const provider = new OpenSourceCalculatorProvider();
    const expressions: CalculatorExpression[] = [
      { id: 'a', latex: 'y=2x+1', source: 'y=2x+1', color: '#c74440' },
      { id: 'b', latex: 'y=-x+7', source: 'y=-x+7', color: '#2d70b3' },
    ];
    provider.setExpressions(expressions);

    const snapshot = provider.getState() as { expressions: CalculatorExpression[] };
    expect(snapshot.expressions).toHaveLength(2);

    const fresh = new OpenSourceCalculatorProvider();
    fresh.setState(snapshot);
    const restored = fresh.getState() as { expressions: CalculatorExpression[] };
    expect(restored.expressions.map(e => e.id)).toEqual(['a', 'b']);
    expect(restored.expressions[0].source).toBe('y=2x+1');
  });

  it('adds, removes and clears expressions', () => {
    const provider = new OpenSourceCalculatorProvider();
    provider.addExpression({ id: 'a', latex: 'y=x', source: 'y=x' });
    provider.addExpression({ id: 'b', latex: 'y=x^2', source: 'y=x^2' });
    expect((provider.getState() as { expressions: unknown[] }).expressions).toHaveLength(2);

    provider.removeExpression('a');
    expect((provider.getState() as { expressions: unknown[] }).expressions).toHaveLength(1);

    provider.clear();
    expect((provider.getState() as { expressions: unknown[] }).expressions).toHaveLength(0);
  });

  it('persists the angle mode through state', () => {
    const provider = new OpenSourceCalculatorProvider();
    provider.setAngleMode('degrees');
    expect((provider.getState() as { angleMode: string }).angleMode).toBe('degrees');

    const fresh = new OpenSourceCalculatorProvider();
    fresh.setState(provider.getState());
    expect((fresh.getState() as { angleMode: string }).angleMode).toBe('degrees');
  });

  it('reports onChange for edits', () => {
    const seen: string[] = [];
    const provider = new OpenSourceCalculatorProvider({
      onChange: (expressions, angleMode) => { seen.push(angleMode); void expressions; },
    });
    provider.addExpression({ id: 'a', latex: 'y=x', source: 'y=x' });
    provider.setAngleMode('radians');
    expect(seen).toEqual(['radians']);
  });
});
