import questionBank2 from '../../Questions 2.json';
import questionBank3 from '../../Questions3.json';
import type { Bank, Question } from '../types';

/**
 * Central bank manifest. Adding a future built-in bank requires only:
 *   1. adding its JSON (or folder) to the repo, and
 *   2. adding one entry here.
 */
interface BuiltinBankEntry {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  assetBase: string;
}

export const BUILTIN_BANKS: BuiltinBankEntry[] = [
  {
    id: 'questions-2',
    title: 'Digital SAT — Calculator Practice',
    description: 'Core 12-question bank covering all four SAT domains.',
    questions: questionBank2 as Question[],
    assetBase: '.',
  },
  {
    id: 'questions-3',
    title: 'Extracted SAT Questions',
    description: 'Questions extracted from SAT practice materials (source metadata preserved).',
    questions: questionBank3 as Question[],
    assetBase: '.',
  },
];

const IMPORTED_KEY = 'sat-math-lab-imported-banks-v1';

let imported: Bank[] = [];

function persistImported(): void {
  try {
    const serializable = imported.map(bank => ({
      id: bank.id,
      title: bank.title,
      description: bank.description,
      questions: bank.questions,
      assetBase: bank.assetBase,
    }));
    const text = JSON.stringify(serializable);
    if (text.length > 8_000_000) {
      // Too large for localStorage — keep it session-only but don't crash.
      return;
    }
    localStorage.setItem(IMPORTED_KEY, text);
  } catch {
    /* storage unavailable or quota exceeded */
  }
}

function restoreImported(): void {
  try {
    const text = localStorage.getItem(IMPORTED_KEY);
    if (!text) return;
    const raw = JSON.parse(text) as Array<Omit<Bank, 'builtin'>>;
    imported = raw.filter(b => b && Array.isArray(b.questions)).map(b => ({
      id: b.id, title: b.title, description: b.description,
      questions: b.questions, assetBase: b.assetBase ?? '', builtin: false,
    }));
  } catch {
    imported = [];
  }
}

export function builtinBanks(): Bank[] {
  return BUILTIN_BANKS.map(b => ({ ...b, builtin: true }));
}

export function registerImportedBank(bank: Omit<Bank, 'builtin'>): Bank {
  const full: Bank = { ...bank, builtin: false };
  imported = imported.filter(b => b.id !== bank.id);
  imported.push(full);
  persistImported();
  return full;
}

export function importedBanks(): Bank[] {
  return imported;
}

export function allBanks(): Bank[] {
  return [...builtinBanks(), ...imported];
}

export function findBank(id: string): Bank | undefined {
  return allBanks().find(b => b.id === id);
}

export function findQuestionByKey(key: string): { bank: Bank; question: Question } | undefined {
  const index = key.indexOf('::');
  const bankId = index < 0 ? '' : key.slice(0, index);
  const questionId = index < 0 ? key : key.slice(index + 2);
  const bank = allBanks().find(b => b.id === bankId);
  if (!bank) return undefined;
  const question = bank.questions.find(q => q.id === questionId);
  return question ? { bank, question } : undefined;
}

export function initBanks(): void {
  if (typeof localStorage !== 'undefined') restoreImported();
}

/** Test helper: clear imported banks + their persisted copy. */
export function resetImportedBanks(): void {
  imported = [];
  try { localStorage.removeItem(IMPORTED_KEY); } catch { /* ignore */ }
}
