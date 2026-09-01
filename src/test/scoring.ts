import type { Bank, Question } from '../types';
import { findQuestionByKey } from '../questions/banks';

export interface BucketResult {
  label: string;
  total: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  pct: number;
}

export interface QuestionResult {
  key: string;
  question: Question;
  bankId: string;
  bankTitle: string;
  response: string;
  answered: boolean;
  correct: boolean;
}

export interface TestResults {
  total: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  pct: number;
  domains: BucketResult[];
  skills: BucketResult[];
  difficulties: BucketResult[];
  banks: BucketResult[];
  perQuestion: QuestionResult[];
}

function isCorrect(response: string | undefined, answer: string): boolean {
  const r = (response ?? '').trim().toLowerCase();
  const a = answer.trim().toLowerCase();
  return r !== '' && r === a;
}

function finishBucket(map: Map<string, { correct: number; incorrect: number; unanswered: number }>): BucketResult[] {
  const out: BucketResult[] = [];
  for (const [label, counts] of map) {
    const total = counts.correct + counts.incorrect + counts.unanswered;
    out.push({
      label,
      total,
      correct: counts.correct,
      incorrect: counts.incorrect,
      unanswered: counts.unanswered,
      pct: total ? Math.round((counts.correct / total) * 100) : 0,
    });
  }
  return out.sort((a, b) => b.total - a.total);
}

export function computeResults(order: string[], responses: Record<string, string>): TestResults {
  const domainMap = new Map<string, { correct: number; incorrect: number; unanswered: number }>();
  const skillMap = new Map<string, { correct: number; incorrect: number; unanswered: number }>();
  const difficultyMap = new Map<string, { correct: number; incorrect: number; unanswered: number }>();
  const bankMap = new Map<string, { correct: number; incorrect: number; unanswered: number }>();

  let correct = 0;
  let incorrect = 0;
  let unanswered = 0;
  const perQuestion: QuestionResult[] = [];

  for (const key of order) {
    const resolved = findQuestionByKey(key);
    if (!resolved) continue;
    const { bank, question } = resolved;
    const response = responses[key] ?? '';
    const answered = response.trim() !== '';
    const right = isCorrect(response, question.answer);

    if (!answered) unanswered += 1;
    else if (right) correct += 1;
    else incorrect += 1;

    for (const [map, label] of [[domainMap, question.domain], [skillMap, question.skill], [difficultyMap, String(question.difficulty)], [bankMap, bank.id]] as Array<[Map<string, { correct: number; incorrect: number; unanswered: number }>, string]>) {
      const entry = map.get(label) ?? { correct: 0, incorrect: 0, unanswered: 0 };
      if (!answered) entry.unanswered += 1;
      else if (right) entry.correct += 1;
      else entry.incorrect += 1;
      map.set(label, entry);
    }

    perQuestion.push({ key, question, bankId: bank.id, bankTitle: bank.title, response, answered, correct: right });
  }

  const total = order.length;
  return {
    total,
    correct,
    incorrect,
    unanswered,
    pct: total ? Math.round((correct / total) * 100) : 0,
    domains: finishBucket(domainMap),
    skills: finishBucket(skillMap),
    difficulties: finishBucket(difficultyMap).sort((a, b) => Number(a.label) - Number(b.label)),
    banks: finishBucket(bankMap),
    perQuestion,
  };
}

export function availableCount(banks: Bank[], bankIds: string[], domainFilters: string[], difficultyFilters: Array<1 | 2 | 3>): number {
  const selected = banks.filter(b => bankIds.length === 0 || bankIds.includes(b.id));
  const seen = new Set<string>();
  let count = 0;
  for (const bank of selected) {
    for (const q of bank.questions) {
      if (domainFilters.length && !domainFilters.includes(q.domain)) continue;
      if (difficultyFilters.length && !difficultyFilters.includes(q.difficulty)) continue;
      const key = `${bank.id}::${q.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      count += 1;
    }
  }
  return count;
}
