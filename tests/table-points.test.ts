import { describe, expect, it } from 'vitest';
import { parseNumber, validPoints } from '../src/calculator/opensource-provider';

describe('open-source table points', () => {
  it('parses fractions, decimals, and negatives', () => {
    expect(parseNumber('3/5')).toBeCloseTo(0.6);
    expect(parseNumber('-2.5')).toBe(-2.5);
    expect(parseNumber('0')).toBe(0);
    expect(parseNumber('7/2')).toBeCloseTo(3.5);
  });

  it('rejects empty and invalid inputs', () => {
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('abc')).toBeNull();
    expect(parseNumber('1/0')).toBeNull();
    expect(parseNumber('1 2 3')).toBeNull();
  });

  it('converts valid rows to points, ignoring incomplete/invalid rows', () => {
    const rows = [
      { x: '1', y: '2' },
      { x: '3/2', y: '-4' },
      { x: '', y: '' },
      { x: 'x', y: '5' },
      { x: '2.5', y: '0.5' },
    ];
    expect(validPoints(rows)).toEqual([
      { x: 1, y: 2 },
      { x: 1.5, y: -4 },
      { x: 2.5, y: 0.5 },
    ]);
  });
});
