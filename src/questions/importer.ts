import type { CalculatorStrategy, Domain, Question } from '../types';

const domains: Domain[] = ['Algebra', 'Advanced Math', 'Problem-Solving and Data Analysis', 'Geometry and Trigonometry'];

function validateStrategy(candidate: unknown, index: number): CalculatorStrategy | undefined {
  if (candidate === undefined || candidate === null) return undefined;
  if (typeof candidate !== 'object') throw new Error(`Question ${index + 1} has an invalid calculatorStrategy.`);
  const s = candidate as Partial<CalculatorStrategy>;
  if (typeof s.recommended !== 'boolean') throw new Error(`Question ${index + 1} strategy needs a "recommended" flag.`);
  if (typeof s.instructions !== 'string' || !s.instructions.trim()) throw new Error(`Question ${index + 1} strategy needs "instructions".`);
  if (s.provider !== undefined && s.provider !== 'desmos' && s.provider !== 'either') throw new Error(`Question ${index + 1} strategy has an invalid provider.`);
  if (s.expressions !== undefined) {
    if (!Array.isArray(s.expressions)) throw new Error(`Question ${index + 1} strategy expressions must be an array.`);
    for (const expression of s.expressions) {
      if (typeof expression !== 'object' || expression === null || typeof expression.latex !== 'string') {
        throw new Error(`Question ${index + 1} strategy expression needs a "latex" string.`);
      }
    }
  }
  if (s.table !== undefined) {
    if (typeof s.table !== 'object' || s.table === null || !Array.isArray(s.table.columns) || s.table.columns.length === 0) {
      throw new Error(`Question ${index + 1} strategy table needs a non-empty "columns" array.`);
    }
    for (const column of s.table.columns) {
      if (typeof column !== 'object' || column === null || typeof column.latex !== 'string') {
        throw new Error(`Question ${index + 1} strategy table column needs a "latex" string.`);
      }
    }
  }
  return s as CalculatorStrategy;
}

export function validateQuestionBank(value: unknown): Question[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error('The question bank must be a non-empty JSON array.');
  const ids = new Set<string>();
  return value.map((candidate, index) => {
    if (!candidate || typeof candidate !== 'object') throw new Error(`Question ${index + 1} is not an object.`);
    const q = candidate as Partial<Question>;
    if (!q.id || ids.has(q.id)) throw new Error(`Question ${index + 1} needs a unique id.`);
    if (!q.prompt || !q.answer || !q.explanation) throw new Error(`Question ${index + 1} is missing prompt, answer, or explanation.`);
    if (!q.domain || !domains.includes(q.domain)) throw new Error(`Question ${index + 1} has an invalid SAT domain.`);
    if (q.type !== 'multiple-choice' && q.type !== 'student-produced-response') throw new Error(`Question ${index + 1} has an invalid type.`);
    if (q.type === 'multiple-choice' && (!Array.isArray(q.choices) || q.choices.length < 2)) throw new Error(`Question ${index + 1} needs answer choices.`);
    ids.add(q.id);
    return {
      id: q.id, domain: q.domain, skill: q.skill || 'Imported question', difficulty: q.difficulty || 2,
      prompt: q.prompt, type: q.type, choices: q.choices, answer: q.answer,
      explanation: q.explanation, calculatorTip: q.calculatorTip,
      calculatorStrategy: validateStrategy(q.calculatorStrategy, index),
    } as Question;
  });
}

export async function importQuestionFile(file: File): Promise<Question[]> {
  if (!file.name.toLowerCase().endsWith('.json')) throw new Error('Choose a JSON question-bank file.');
  return validateQuestionBank(JSON.parse(await file.text()) as unknown);
}
