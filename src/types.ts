import type { AngleMode } from './calculator/types';

export type Domain = 'Algebra' | 'Advanced Math' | 'Problem-Solving and Data Analysis' | 'Geometry and Trigonometry';

export interface Choice { id: string; text: string }

/**
 * Structured calculator setup for a question. The student can send this to the
 * active calculator via the "Send setup to calculator" button. It must never
 * reveal the answer — only the neutral setup the student still has to interpret.
 */
export interface CalculatorStrategy {
  /** Whether a calculator is recommended for this question. */
  recommended: boolean;
  /** Which provider can honour this setup. 'desmos' requires the official API. */
  provider?: 'desmos' | 'either';
  expressions?: Array<{
    id?: string;
    latex: string;
    /** Optional open-source (math.js) equivalent for the fallback provider. */
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
  /** Student-facing guidance on how to interpret the result. */
  instructions: string;
}

export interface Question {
  id: string;
  domain: Domain;
  skill: string;
  difficulty: 1 | 2 | 3;
  prompt: string;
  type: 'multiple-choice' | 'student-produced-response';
  choices?: Choice[];
  answer: string;
  explanation: string;
  calculatorTip?: string;
  calculatorStrategy?: CalculatorStrategy;
}

export interface Expression {
  id: string;
  source: string;
  color: string;
  visible: boolean;
}

export interface SessionState {
  current: number;
  secondsRemaining: number;
  timerHidden: boolean;
  responses: Record<string, string>;
  review: string[];
  expressions: Expression[];
  angleMode: AngleMode;
  /** Serialized official-Desmos calculator state (persisted across reloads). */
  calculatorState?: unknown;
}
