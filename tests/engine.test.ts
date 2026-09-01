import { describe, expect, it } from 'vitest';
import { evaluateExpression, functionBody, tableValues } from '../src/calculator/engine';

describe('calculator engine', () => {
  it('evaluates SAT combinatorics aliases', () => {
    expect(evaluateExpression('nCr(5,2)')).toBe(10);
    expect(evaluateExpression('nPr(5,2)')).toBe(20);
  });
  it('normalizes common classroom symbols', () => {
    expect(evaluateExpression('2×π')).toBeCloseTo(2 * Math.PI);
    expect(evaluateExpression('5!')).toBe(120);
    expect(evaluateExpression('sqrt{144}+5!')).toBe(132);
  });
  it('extracts and tabulates functions', () => {
    expect(functionBody('y=x^2-4')).toBe('x^2-4');
    expect(tableValues('y=x^2', -1, 1, 1).map(row => row.y)).toEqual([1, 0, 1]);
  });
});
