import questionBank2 from '../../Questions 2.json';
import questionBank4 from '../../Questions4.json';
import { READING_WRITING_DOMAINS, type Bank, type PracticeSection, type Question } from '../types';
import questionBankRW from '../../Questions RW.json';
import practiceTest2Math from '../../Questions Practice Test 2 Math.json';
import practiceTest2ReadingWriting from '../../Questions Practice Test 2 Reading and Writing.json';
import momentix2TestsMath from '../../Questions Momentix 2 Tests Math.json';
import rwInformationIdeas from '../../Questions RW Information_and_Ideas.json';
import rwExpressionIdeas from '../../Questions RW Expression_of_Ideas.json';
import rwConventions from '../../Questions RW Standard_English_Conventions.json';

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
  section?: PracticeSection;
}

export const BUILTIN_BANKS: BuiltinBankEntry[] = [
  {
    id: 'questions-2',
    title: 'Digital SAT — Calculator Practice',
    description: 'Core 12-question bank covering all four SAT domains.',
    questions: questionBank2 as Question[],
    assetBase: '.',
    section: 'math',
  },
  {
    id: 'princeton-ready-visuals',
    title: 'Princeton Review — QA-Approved Visual Questions',
    description: 'Eight reviewed SAT Math questions using tables, graphs, and geometry figures.',
    questions: questionBank4 as Question[],
    // Questions4 uses deploy-root-relative paths so it also works through the
    // standalone JSON importer, which does not have a bank-specific asset base.
    assetBase: '.',
    section: 'math',
  },
  {
    id: 'reading-writing-craft',
    title: 'SAT Reading and Writing — Craft and Structure',
    description: '24 original Reading and Writing practice questions in sequence.',
    questions: questionBankRW as Question[],
    assetBase: '.',
    section: 'reading-writing',
  },
  {
    id: 'practice-test-2-math',
    title: 'Princeton Review — Practice Test 2 Math (66 extracted questions)',
    description: 'Verified Practice Test 2 Math extraction, including both adaptive routes.',
    questions: practiceTest2Math as Question[],
    assetBase: './banks/practice-test-2',
    section: 'math',
  },
  {
    id: 'momentix-2-tests-math',
    title: 'Mometrix — SAT Practice Tests 1 & 2 Math (88 questions)',
    description: 'Two Mometrix Math practice tests with complete question images, answers, and review explanations.',
    questions: momentix2TestsMath as Question[],
    assetBase: './banks/momentix-2-tests',
    section: 'math',
  },
  {
    id: 'practice-test-2-reading-writing',
    title: 'Princeton Review — Practice Test 2 Reading and Writing (79 extracted questions)',
    description: 'Verified Practice Test 2 Reading and Writing extraction, including both adaptive routes.',
    questions: practiceTest2ReadingWriting as Question[],
    assetBase: './banks/practice-test-2',
    section: 'reading-writing',
  },
  {
    id: 'practice-test-2-rw-information-ideas',
    title: 'Practice Test 2 — Information and Ideas',
    description: 'Practice Test 2 Reading and Writing questions focused on Information and Ideas.',
    questions: rwInformationIdeas as Question[],
    assetBase: './banks/practice-test-2',
    section: 'reading-writing',
  },
  {
    id: 'practice-test-2-rw-expression-ideas',
    title: 'Practice Test 2 — Expression of Ideas',
    description: 'Practice Test 2 Reading and Writing questions focused on Expression of Ideas.',
    questions: rwExpressionIdeas as Question[],
    assetBase: './banks/practice-test-2',
    section: 'reading-writing',
  },
  {
    id: 'practice-test-2-rw-conventions',
    title: 'Practice Test 2 — Standard English Conventions',
    description: 'Practice Test 2 Reading and Writing questions focused on Standard English Conventions.',
    questions: rwConventions as Question[],
    assetBase: './banks/practice-test-2',
    section: 'reading-writing',
  },
];

const IMPORTED_KEY = 'sat-math-lab-imported-banks-v1';

let imported: Bank[] = [];

const PRINCETON_VISUAL_ASSET_ROOT = './banks/princeton-ready-visuals/';

export function bankSection(bank: Pick<Bank, 'section' | 'questions'>): PracticeSection {
  return bank.section ?? (bank.questions.some(question => READING_WRITING_DOMAINS.includes(question.domain)) ? 'reading-writing' : 'math');
}

/**
 * Questions4 was initially imported before its images had deployable URLs.
 * Repair that persisted browser copy while preserving its bank id so active
 * sessions using `questions4::…` keys continue to resolve after deployment.
 */
export function normalizeImportedBank(bank: Omit<Bank, 'builtin'>): Omit<Bank, 'builtin'> {
  if (bank.id !== 'questions4' && bank.title.toLowerCase() !== 'questions4') return bank;
  return {
    ...bank,
    questions: bank.questions.map(question => ({
      ...question,
      assets: question.assets?.map(asset => {
        if (!/^\.?\/?assets\//i.test(asset.src)) return asset;
        const relative = asset.src.replace(/^\.?\/?/, '');
        return { ...asset, src: `${PRINCETON_VISUAL_ASSET_ROOT}${relative}` };
      }),
    })),
    assetBase: '',
  };
}

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
    imported = raw.filter(b => b && Array.isArray(b.questions)).map(b => {
      const normalized = normalizeImportedBank({
        id: b.id, title: b.title, description: b.description,
        questions: b.questions, assetBase: b.assetBase ?? '',
      });
      return { ...normalized, builtin: false };
    });
    // Save repaired legacy paths so subsequent loads no longer need migration.
    persistImported();
  } catch {
    imported = [];
  }
}

export function builtinBanks(): Bank[] {
  return BUILTIN_BANKS.map(b => ({ ...b, builtin: true }));
}

export function registerImportedBank(bank: Omit<Bank, 'builtin'>): Bank {
  const full: Bank = { ...normalizeImportedBank(bank), builtin: false };
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
