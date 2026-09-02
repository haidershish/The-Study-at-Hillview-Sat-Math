import { describe, expect, it } from 'vitest';
import { validateQuestionBank } from '../src/questions/importer';
import questionBank from '../Questions 2.json';
import questionBank3 from '../Questions3.json';
import questionBank4 from '../Questions4.json';

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

  it('preserves calculator strategies, assets, and source metadata', () => {
    const bank = [{
      id: 'D', domain: 'Algebra', skill: 's', difficulty: 3, prompt: 'p',
      type: 'multiple-choice', choices: [{ id: 'a', text: 'x' }, { id: 'b', text: 'y' }], answer: 'a', explanation: 'e',
      calculatorTip: 'tip',
      calculatorStrategy: { recommended: true, provider: 'desmos', expressions: [{ id: 'e1', latex: 'y=x', source: 'y=x' }], table: { columns: [{ latex: 'x_1', values: [1, 2] }, { latex: 'y_1', values: [2, 4] }] }, angleMode: 'degrees', instructions: 'i' },
      assets: [{ id: 'fig', type: 'diagram', src: 'assets/fig.png', alt: 'figure', sourcePage: 4 }],
      sourceType: 'extracted', sourcePage: 4, sourceQuestion: 'Graph Image 7', assetIds: ['image-7.png'], needsReview: true, sourceNotes: 'note',
    }];
    const [q] = validateQuestionBank(bank);
    expect(q.calculatorTip).toBe('tip');
    expect(q.calculatorStrategy?.provider).toBe('desmos');
    expect(q.calculatorStrategy?.table?.columns).toHaveLength(2);
    expect(q.calculatorStrategy?.angleMode).toBe('degrees');
    expect(q.assets).toHaveLength(1);
    expect(q.assets![0].alt).toBe('figure');
    expect(q.sourceType).toBe('extracted');
    expect(q.sourcePage).toBe(4);
    expect(q.sourceQuestion).toBe('Graph Image 7');
    expect(q.assetIds).toEqual(['image-7.png']);
    expect(q.needsReview).toBe(true);
    expect(q.sourceNotes).toBe('note');
  });

  it('preserves source metadata from the extracted bank (Questions3.json)', () => {
    const questions = validateQuestionBank(questionBank3 as unknown);
    const extracted = questions.find(q => q.sourceType === 'extracted');
    expect(extracted).toBeTruthy();
    expect(extracted!.sourcePage).toBeGreaterThan(0);
    expect(Array.isArray(extracted!.assetIds)).toBe(true);
  });

  it('accepts the QA-approved visual bank with one asset per question', () => {
    const questions = validateQuestionBank(questionBank4 as unknown);
    expect(questions).toHaveLength(8);
    expect(questions.every(q => q.assets?.length === 1)).toBe(true);
    expect(questions.every(q => q.needsReview === false)).toBe(true);
    expect(questions.every(q => q.assets![0].src.startsWith('./banks/princeton-ready-visuals/assets/'))).toBe(true);
    expect(new Set(questions.map(q => q.assets![0].type))).toEqual(new Set(['table', 'graph', 'figure', 'diagram']));
  });
});
