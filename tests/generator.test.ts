import { describe, expect, it } from 'vitest';
import { buildPool, fisherYates, generateOrder, seededRandom } from '../src/test/generator';
import type { Bank, Question, TestConfig } from '../src/types';

function q(id: string, domain: Question['domain'], difficulty: 1 | 2 | 3): Question {
  return {
    id, domain, skill: `s-${id}`, difficulty, prompt: `p-${id}`,
    type: 'multiple-choice', choices: [{ id: 'a', text: 'a' }, { id: 'b', text: 'b' }],
    answer: 'a', explanation: 'e',
  };
}

function bank(id: string, questions: Question[]): Bank {
  return { id, title: id, description: '', questions, assetBase: '', builtin: true };
}

const banks = [
  bank('a', [q('a1', 'Algebra', 1), q('a2', 'Algebra', 2), q('a3', 'Advanced Math', 2), q('a4', 'Geometry and Trigonometry', 3)]),
  bank('b', [q('b1', 'Algebra', 1), q('b2', 'Problem-Solving and Data Analysis', 2)]),
];

describe('test generator', () => {
  it('builds a combined pool with duplicate prevention', () => {
    const pool = buildPool(banks, { bankIds: [], domainFilters: [], difficultyFilters: [] });
    expect(pool).toHaveLength(6);
    const keys = pool.map(r => `${r.bankId}::${r.question.id}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('filters by domain and difficulty', () => {
    const pool = buildPool(banks, { bankIds: [], domainFilters: ['Algebra'], difficultyFilters: [1] });
    expect(pool.map(r => r.question.id)).toEqual(['a1', 'b1']);
  });

  it('filters by bank', () => {
    const pool = buildPool(banks, { bankIds: ['b'], domainFilters: [], difficultyFilters: [] });
    expect(pool.map(r => r.bankId)).toEqual(['b', 'b']);
  });

  it('combined mode preserves order and applies count', () => {
    const config: TestConfig = { mode: 'combined', bankIds: [], domainFilters: [], difficultyFilters: [], questionCount: 4, domainBalanced: false };
    const order = generateOrder(banks, config);
    expect(order).toHaveLength(4);
    expect(order[0]).toBe('a::a1');
  });

  it('random mode with a seed is reproducible', () => {
    const config: TestConfig = { mode: 'random', bankIds: [], domainFilters: [], difficultyFilters: [], questionCount: 'full', seed: 42, domainBalanced: false };
    expect(generateOrder(banks, config)).toEqual(generateOrder(banks, config));
    expect(generateOrder(banks, config)).toHaveLength(6);
  });

  it('random mode produces a full shuffled pool with no repeats', () => {
    const config: TestConfig = { mode: 'random', bankIds: [], domainFilters: [], difficultyFilters: [], questionCount: 'full', domainBalanced: false };
    const order = generateOrder(banks, config);
    expect(order).toHaveLength(6);
    expect(new Set(order).size).toBe(6);
  });

  it('domain-balanced selection respects the count', () => {
    const config: TestConfig = { mode: 'random', bankIds: [], domainFilters: [], difficultyFilters: [], questionCount: 4, seed: 1, domainBalanced: true };
    const order = generateOrder(banks, config);
    expect(order).toHaveLength(4);
    expect(new Set(order).size).toBe(4);
  });

  it('fisherYates is deterministic with a seeded PRNG', () => {
    expect(fisherYates([1, 2, 3, 4, 5], seededRandom(7))).toEqual(fisherYates([1, 2, 3, 4, 5], seededRandom(7)));
  });
});
