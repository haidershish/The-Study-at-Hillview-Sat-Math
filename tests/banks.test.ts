import { beforeEach, describe, expect, it } from 'vitest';
import { allBanks, bankSection, builtinBanks, findQuestionByKey, normalizeImportedBank, registerImportedBank, resetImportedBanks } from '../src/questions/banks';
import type { Question } from '../src/types';

beforeEach(() => resetImportedBanks());

describe('question banks', () => {
  it('loads multiple built-in banks', () => {
    const banks = builtinBanks();
    expect(banks.length).toBeGreaterThanOrEqual(2);
    expect(banks.map(b => b.id)).toContain('questions-2');
    expect(banks.map(b => b.id)).not.toContain('questions-3');
    expect(banks.map(b => b.id)).toContain('princeton-ready-visuals');
    expect(banks.map(b => b.id)).toContain('reading-writing-craft');
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

  it('keeps the Reading and Writing bank separate from Math banks', () => {
    const math = builtinBanks().find(bank => bank.id === 'questions-2');
    const readingWriting = builtinBanks().find(bank => bank.id === 'reading-writing-craft');
    expect(math && bankSection(math)).toBe('math');
    expect(readingWriting && bankSection(readingWriting)).toBe('reading-writing');
    expect(readingWriting?.questions).toHaveLength(24);
  });

  it('does not resolve questions from the retired extracted bank', () => {
    expect(findQuestionByKey('questions-3::ALG-001')).toBeUndefined();
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

  it('migrates persisted Questions4 image paths without changing its bank id', () => {
    const q: Question = {
      id: 'PRV-P180-Q7', domain: 'Algebra', skill: 's', difficulty: 2, prompt: 'p',
      type: 'multiple-choice', choices: [{ id: 'A', text: 'a' }, { id: 'B', text: 'b' }],
      answer: 'A', explanation: 'e',
      assets: [{ id: 'table', type: 'table', src: 'assets/p180_7_table.png', alt: 'table' }],
    };
    const migrated = normalizeImportedBank({ id: 'questions4', title: 'Questions4', description: 'd', questions: [q], assetBase: '' });
    expect(migrated.id).toBe('questions4');
    expect(migrated.questions[0].assets?.[0].src).toBe('./banks/princeton-ready-visuals/assets/p180_7_table.png');
  });
});
