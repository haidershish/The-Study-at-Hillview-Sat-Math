import { describe, expect, it } from 'vitest';
import { validateQuestionBank } from '../src/questions/importer';
import questionBank from '../Questions 2.json';

describe('question-bank validation', () => {
  it('accepts the bundled 12-question bank with strategies intact', () => {
    const questions = validateQuestionBank(questionBank);
    expect(questions).toHaveLength(12);
    const withStrategy = questions.filter(q => q.calculatorStrategy);
    expect(withStrategy.length).toBeGreaterThan(0);
  });

  it('rejects an empty bank', () => {
    expect(() => validateQuestionBank([])).toThrow(/non-empty/);
  });

  it('rejects a duplicate id', () => {
    const bank = [
      { id: 'A', domain: 'Algebra', skill: 's', difficulty: 1, prompt: 'p', type: 'multiple-choice', choices: [{ id: 'a', text: 'x' }, { id: 'b', text: 'y' }], answer: 'a', explanation: 'e' },
      { id: 'A', domain: 'Algebra', skill: 's', difficulty: 1, prompt: 'p', type: 'multiple-choice', choices: [{ id: 'a', text: 'x' }, { id: 'b', text: 'y' }], answer: 'a', explanation: 'e' },
    ];
    expect(() => validateQuestionBank(bank)).toThrow(/unique id/);
  });

  it('rejects a strategy missing instructions', () => {
    const bank = [{
      id: 'B', domain: 'Algebra', skill: 's', difficulty: 1, prompt: 'p',
      type: 'multiple-choice', choices: [{ id: 'a', text: 'x' }, { id: 'b', text: 'y' }], answer: 'a', explanation: 'e',
      calculatorStrategy: { recommended: true, expressions: [{ latex: 'y=x' }] },
    }];
    expect(() => validateQuestionBank(bank)).toThrow(/instructions/);
  });

  it('rejects a strategy expression missing latex', () => {
    const bank = [{
      id: 'C', domain: 'Algebra', skill: 's', difficulty: 1, prompt: 'p',
      type: 'multiple-choice', choices: [{ id: 'a', text: 'x' }, { id: 'b', text: 'y' }], answer: 'a', explanation: 'e',
      calculatorStrategy: { recommended: true, instructions: 'i', expressions: [{ color: 'red' }] },
    }];
    expect(() => validateQuestionBank(bank)).toThrow(/latex/);
  });
});
