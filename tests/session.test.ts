// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { clearState, initialState, loadState, saveState } from '../src/state/store';

beforeEach(() => clearState());

describe('session persistence', () => {
  it('persists and restores session configuration and ordered question keys', () => {
    const state = initialState();
    state.screen = 'test';
    state.order = ['questions-2::ALG-001', 'questions-3::ADV-001'];
    state.responses = { 'questions-2::ALG-001': 'B' };
    state.review = ['questions-2::ALG-001'];
    state.current = 1;
    state.testConfig = { mode: 'random', bankIds: ['questions-2'], domainFilters: ['Algebra'], difficultyFilters: [], questionCount: 10, domainBalanced: false };
    saveState(state);

    const restored = loadState();
    expect(restored.screen).toBe('test');
    expect(restored.order).toEqual(state.order);
    expect(restored.responses['questions-2::ALG-001']).toBe('B');
    expect(restored.review).toEqual(['questions-2::ALG-001']);
    expect(restored.current).toBe(1);
    expect(restored.testConfig?.mode).toBe('random');
    expect(restored.testConfig?.questionCount).toBe(10);
  });

  it('initial state includes calculator and table fields', () => {
    const s = initialState();
    expect(s.expressions).toEqual([]);
    expect(s.angleMode).toBe('radians');
    expect(s.tableRows).toEqual([{ x: '', y: '' }]);
    expect(s.connectPoints).toBe(false);
    expect(Array.isArray(s.order)).toBe(true);
    expect(s.screen).toBe('home');
  });

  it('migrates the legacy seeded graph pair to an empty calculator', () => {
    const state = initialState();
    state.expressions = [
      { id: 'legacy-a', source: 'y=2x+1', color: '#c74440', visible: true },
      { id: 'legacy-b', source: 'y=-x+7', color: '#2d70b3', visible: true },
    ];
    saveState(state);
    expect(loadState().expressions).toEqual([]);
  });
});
