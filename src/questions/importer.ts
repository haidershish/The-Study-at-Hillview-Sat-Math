import type { Domain, Question } from '../types';

const domains: Domain[] = ['Algebra', 'Advanced Math', 'Problem-Solving and Data Analysis', 'Geometry and Trigonometry'];

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
    } as Question;
  });
}

export async function importQuestionFile(file: File): Promise<Question[]> {
  if (!file.name.toLowerCase().endsWith('.json')) throw new Error('Choose a JSON question-bank file.');
  return validateQuestionBank(JSON.parse(await file.text()) as unknown);
}
