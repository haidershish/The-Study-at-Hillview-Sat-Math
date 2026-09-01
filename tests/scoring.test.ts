import { beforeEach, describe, expect, it } from 'vitest';
import { resetImportedBanks, registerImportedBank } from '../src/questions/banks';
import { availableCount, computeResults } from '../src/test/scoring';
import type { Question } from '../src/types';

function q(id: string, domain: Question['domain'], difficulty: 1 | 2 | 3, answer: string): Question {
  return {
    id, domain, skill: `skill-${id}`, difficulty, prompt: `prompt-${id}`,
    type: 'multiple-choice', choices: [{ id: 'A', text: 'A' }, { id: 'B', text: 'B' }],
    answer, explanation: 'e',
  };
}

beforeEach(() => resetImportedBanks());

describe('scoring', () => {
  it('computes correct/incorrect/unanswered and percentage', () => {
    registerImportedBank({
      id: 't', title: 'Test', description: '', assetBase: '',
      questions: [q('1', 'Algebra', 1, 'A'), q('2', 'Algebra', 2, 'B'), q('3', 'Advanced Math', 3, 'A')],
    });
    const order = ['t::1', 't::2', 't::3'];
    const responses = { 't::1': 'A', 't::2': 'A', 't::3': '' };
    const results = computeResults(order, responses);
    expect(results.correct).toBe(1);
    expect(results.incorrect).toBe(1);
    expect(results.unanswered).toBe(1);
    expect(results.pct).toBe(33);
  });

  it('reports domain and difficulty performance', () => {
    registerImportedBank({
      id: 't', title: 'Test', description: '', assetBase: '',
      questions: [q('1', 'Algebra', 1, 'A'), q('2', 'Advanced Math', 2, 'A')],
    });
    const results = computeResults(['t::1', 't::2'], { 't::1': 'A', 't::2': 'B' });
    const algebra = results.domains.find(d => d.label === 'Algebra');
    expect(algebra).toMatchObject({ correct: 1, incorrect: 0, total: 1 });
    const lvl1 = results.difficulties.find(d => d.label === '1');
    expect(lvl1).toMatchObject({ correct: 1, total: 1 });
  });

  it('counts available questions for a filter set', () => {
    registerImportedBank({
      id: 't', title: 'Test', description: '', assetBase: '',
      questions: [q('1', 'Algebra', 1, 'A'), q('2', 'Algebra', 2, 'B'), q('3', 'Advanced Math', 3, 'A')],
    });
    const banks = [{ id: 't', title: 'Test', description: '', questions: [q('1', 'Algebra', 1, 'A'), q('2', 'Algebra', 2, 'B'), q('3', 'Advanced Math', 3, 'A')], assetBase: '', builtin: false }];
    expect(availableCount(banks, ['t'], ['Algebra'], [])).toBe(2);
    expect(availableCount(banks, ['t'], [], [2])).toBe(1);
  });
});
