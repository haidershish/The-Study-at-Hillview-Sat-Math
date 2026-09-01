import type { SessionState } from '../types';

const KEY = 'sat-math-lab-session-v2';
const colors = ['#c74440', '#2d70b3', '#388c46', '#6042a6', '#000000'];

export const initialState = (): SessionState => ({
  screen: 'home',
  testConfig: undefined,
  order: [],
  current: 0,
  secondsRemaining: 35 * 60,
  timerHidden: false,
  responses: {},
  review: [],
  expressions: [
    { id: crypto.randomUUID(), source: 'y=2x+1', color: colors[0], visible: true },
    { id: crypto.randomUUID(), source: 'y=-x+7', color: colors[1], visible: true },
  ],
  angleMode: 'radians',
  tableRows: [{ x: '', y: '' }],
  connectPoints: false,
  calculatorState: undefined,
});

export function loadState(): SessionState {
  try {
    const value = localStorage.getItem(KEY);
    if (!value) return initialState();
    const parsed = JSON.parse(value) as Partial<SessionState>;
    return { ...initialState(), ...parsed };
  } catch {
    return initialState();
  }
}

export function saveState(state: SessionState): void {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function clearState(): void {
  localStorage.removeItem(KEY);
}

export function nextColor(index: number): string { return colors[index % colors.length]; }

export function exportState(state: SessionState): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'sat-math-session.json';
  link.click();
  URL.revokeObjectURL(link.href);
}
