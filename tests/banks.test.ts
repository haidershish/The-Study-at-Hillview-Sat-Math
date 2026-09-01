import { beforeEach, describe, expect, it } from 'vitest';
import { allBanks, builtinBanks, findQuestionByKey, registerImportedBank, resetImportedBanks } from '../src/questions/banks';
import type { Question } from '../src/types';

beforeEach(() => resetImportedBanks());

describe('question banks', () => {
  it('loads multiple built-in banks', () => {
    const banks = builtinBanks();
    expect(banks.length).toBeGreaterThanOrEqual(2);
    expect(banks.map(b => b.id)).toContain('questions-2');
    expect(banks.map(b => b.id)).toContain('questions-3');
  });

  it('reports title, description, count, domains, and difficulties', () => {
    for (const bank of builtinBanks()) {
      expect(bank.title).toBeTruthy();
      expect(bank.description).toBeTruthy();
      expect(bank.questions.length).toBeGreaterThan(0);
      const domains = new Set(bank.questions.map(q => q.domain));
      const difficulties = new Set(bank.questions.map(q => q.difficulty));
      expect(domains.size).toBeGreaterThan(0);
      expect(difficulties.size).toBeGreaterThan(0);
    }
  });

  it('resolves colliding question ids via bankId::questionId', () => {
    const a = findQuestionByKey('questions-2::ALG-001');
    const b = findQuestionByKey('questions-3::ALG-001');
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
    expect(a!.question.prompt).not.toBe(b!.question.prompt);
  });

  it('registers imported banks', () => {
    const q: Question = {
      id: 'X-1', domain: 'Algebra', skill: 's', difficulty: 1, prompt: 'p',
      type: 'multiple-choice', choices: [{ id: 'a', text: 'a' }, { id: 'b', text: 'b' }],
      answer: 'a', explanation: 'e',
    };
    registerImportedBank({ id: 'my-bank', title: 'My Bank', description: 'd', questions: [q], assetBase: '' });
    expect(allBanks().map(b => b.id)).toContain('my-bank');
    expect(allBanks().find(b => b.id === 'my-bank')?.builtin).toBe(false);
  });
});
