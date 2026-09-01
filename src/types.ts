export type Domain = 'Algebra' | 'Advanced Math' | 'Problem-Solving and Data Analysis' | 'Geometry and Trigonometry';

export interface Choice { id: string; text: string }

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
}
