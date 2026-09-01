import { describe, expect, it } from 'vitest';
import {
  evaluateExpression,
  formatNumber,
  functionBody,
  tableValues,
  unsupportedRelation,
} from '../src/calculator/engine';

describe('calculator engine (math.js)', () => {
  it('evaluates SAT combinatorics aliases', () => {
    expect(evaluateExpression('nCr(5,2)')).toBe(10);
    expect(evaluateExpression('nPr(5,2)')).toBe(20);
  });

  it('normalizes common classroom symbols', () => {
    expect(evaluateExpression('2×π')).toBeCloseTo(2 * Math.PI);
    expect(evaluateExpression('5!')).toBe(120);
    expect(evaluateExpression('sqrt{144}+5!')).toBe(132);
    expect(evaluateExpression('2(x+1)', { x: 2 })).toBe(6);
  });

  it('evaluates Desmos-compatible statistics aliases', () => {
    expect(evaluateExpression('total([1,2,3,4])')).toBe(10);
    expect(evaluateExpression('length([1,2,3,4])')).toBe(4);
    expect(evaluateExpression('mean([1,2,3,4])')).toBe(2.5);
    expect(evaluateExpression('median([1,2,3,4])')).toBe(2.5);
    expect(evaluateExpression('min([1,2,3,4])')).toBe(1);
    expect(evaluateExpression('max([1,2,3,4])')).toBe(4);
  });

  it('computes sample and population standard deviation', () => {
    // stdev (sample) vs stdevp (population) for [1,2,3,4]
    expect(evaluateExpression('stdev([1,2,3,4])')).toBeCloseTo(Math.sqrt(5 / 3), 10);
    expect(evaluateExpression('stdevp([1,2,3,4])')).toBeCloseTo(Math.sqrt(5 / 4), 10);
  });

  it('respects degree mode for trig functions', () => {
    expect(evaluateExpression('sin(30)', {}, 'degrees')).toBeCloseTo(0.5, 10);
    expect(evaluateExpression('sin(pi/6)', {}, 'radians')).toBeCloseTo(0.5, 10);
    expect(evaluateExpression('asin(0.5)', {}, 'degrees')).toBeCloseTo(30, 10);
    expect(evaluateExpression('tan(45)', {}, 'degrees')).toBeCloseTo(1, 10);
  });

  it('extracts and tabulates functions', () => {
    expect(functionBody('y=x^2-4')).toBe('x^2-4');
    expect(tableValues('y=x^2', -1, 1, 1).map(row => row.y)).toEqual([1, 0, 1]);
  });

  it('rejects relations instead of mis-graphing them', () => {
    expect(functionBody('y>2x-3')).toBeNull();
    expect(functionBody('y=x^2 {0<=x<=5}')).toBeNull();
    expect(functionBody('x^2+y^2=49')).toBeNull();
    expect(unsupportedRelation('y>2x-3')).toBe('inequality');
    expect(unsupportedRelation('x^2+y^2=49')).toBe('implicit-equation');
    expect(unsupportedRelation('y_1~mx_1+b')).toBe('regression');
    expect(unsupportedRelation('f(x)={x<0:-x,x>=0:x^2}')).toBe('restriction-or-piecewise');
    expect(unsupportedRelation('y=x^2')).toBeNull();
  });

  it('formats numbers consistently', () => {
    expect(formatNumber(4)).toBe('4');
    expect(formatNumber(0.1 + 0.2)).toBe('0.3');
  });
});
