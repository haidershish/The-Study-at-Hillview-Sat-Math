import type { AngleMode } from './calculator/types';

export type Domain = 'Algebra' | 'Advanced Math' | 'Problem-Solving and Data Analysis' | 'Geometry and Trigonometry';

export const DOMAINS: Domain[] = ['Algebra', 'Advanced Math', 'Problem-Solving and Data Analysis', 'Geometry and Trigonometry'];

export type Difficulty = 1 | 2 | 3;

export const DIFFICULTIES: Difficulty[] = [1, 2, 3];

export interface Choice { id: string; text: string }

/** An image/diagram/figure attached to a question. */
export interface QuestionAsset {
  id: string;
  type: string; // 'diagram' | 'graph' | 'table' | 'figure' | ...
  src: string;  // relative path (resolved against the bank's asset base) or a data:/blob: URL
  alt: string;
  placement?: string; // 'after-prompt' (default) | 'before-choices' | ...
  width?: number;
  height?: number;
  sourcePage?: number;
}

/**
 * Structured calculator setup for a question. The student can send this to the
 * active calculator via the "Send setup to calculator" button. It must never
 * reveal the answer.
 */
export interface CalculatorStrategy {
  recommended: boolean;
  provider?: 'desmos' | 'either';
  expressions?: Array<{
    id?: string;
    latex: string;
    source?: string;
    color?: string;
  }>;
  table?: {
    columns: Array<{
      latex: string;
      values?: Array<number | string>;
    }>;
  };
  angleMode?: AngleMode;
  instructions: string;
}

export interface Question {
  id: string;
  domain: Domain;
  skill: string;
  difficulty: Difficulty;
  prompt: string;
  type: 'multiple-choice' | 'student-produced-response';
  choices?: Choice[];
  answer: string;
  explanation: string;
  calculatorTip?: string;
  calculatorStrategy?: CalculatorStrategy;
  assets?: QuestionAsset[];
  // Source metadata (preserved from extracted/imported banks; not required).
  sourceType?: string;
  sourcePage?: number;
  sourceQuestion?: string;
  assetIds?: string[];
  needsReview?: boolean;
  sourceNotes?: string;
}

export interface Expression {
  id: string;
  source: string;
  color: string;
  visible: boolean;
}

/** How a test was assembled. */
export type TestMode = 'bank' | 'combined' | 'random';

export interface TestConfig {
  mode: TestMode;
  /** Selected bank ids (empty for combined = all banks). */
  bankIds: string[];
  /** Selected domains; empty array = all domains. */
  domainFilters: Domain[];
  /** Selected difficulties; empty array = all difficulties. */
  difficultyFilters: Difficulty[];
  /** Question count, or 'full' for the whole filtered pool. */
  questionCount: number | 'full';
  /** Optional reproducible random seed (random mode). */
  seed?: number;
  /** Balance random selection across domains. */
  domainBalanced: boolean;
}

export type Screen = 'home' | 'test' | 'results';

export interface SessionState {
  screen: Screen;
  testConfig?: TestConfig;
  /** Ordered question keys ("bankId::questionId"), stable across refresh. */
  order: string[];
  current: number;
  secondsRemaining: number;
  timerHidden: boolean;
  /** answers keyed by "bankId::questionId" */
  responses: Record<string, string>;
  /** review flags keyed by "bankId::questionId" */
  review: string[];
  expressions: Expression[];
  angleMode: AngleMode;
  /** Editable x/y data-table rows (open-source provider). */
  tableRows: Array<{ x: string; y: string }>;
  /** Whether the open-source graph connects table points. */
  connectPoints: boolean;
  calculatorState?: unknown;
}

/** A single question bank (built-in or imported at runtime). */
export interface Bank {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  /** Base path/URL used to resolve relative asset `src` values. */
  assetBase: string;
  builtin: boolean;
}

export const questionKey = (bankId: string, questionId: string): string => `${bankId}::${questionId}`;

export const splitQuestionKey = (key: string): { bankId: string; questionId: string } => {
  const index = key.indexOf('::');
  if (index < 0) return { bankId: '', questionId: key };
  return { bankId: key.slice(0, index), questionId: key.slice(index + 2) };
};
