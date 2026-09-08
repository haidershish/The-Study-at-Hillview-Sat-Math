// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { computeResults } from '../src/test/scoring';
import { registerImportedBank, resetImportedBanks } from '../src/questions/banks';
import { clearProfile, loadProfile, profileStorageKey, recordCompletedSession } from '../src/profile';
import type { Question } from '../src/types';

function question(id: string, skill: string, answer = 'A'): Question {
  return {
    id,
    domain: 'Algebra',
    skill,
    difficulty: 1,
    prompt: id,
    type: 'multiple-choice',
    choices: [{ id: 'A', text: 'A' }, { id: 'B', text: 'B' }],
    answer,
    explanation: '',
  };
}

beforeEach(() => {
  localStorage.clear();
  resetImportedBanks();
  registerImportedBank({
    id: 'profile-test', title: 'Profile test', description: '', assetBase: '',
    questions: [question('one', 'Linear equations'), question('two', 'Linear equations', 'B'), question('three', 'Quadratics')],
  });
});

describe('user profiles', () => {
  it('records a completed result and derives summary, tracks, and recommendations', () => {
    const results = computeResults(
      ['profile-test::one', 'profile-test::two', 'profile-test::three'],
      { 'profile-test::one': 'B', 'profile-test::two': 'B', 'profile-test::three': '' },
    );

    const profile = recordCompletedSession('haider', results, { sessionId: 'attempt-1', completedAt: '2026-09-08T10:00:00.000Z' });
    expect(profile.summary).toMatchObject({ sessions: 1, questions: 3, correct: 1, pct: 33 });
    expect(profile.domains[0]).toMatchObject({ label: 'Algebra', total: 3, correct: 1, incorrect: 1, unanswered: 1, pct: 33, status: 'needs-improvement' });
    expect(profile.skills.find(skill => skill.label === 'Linear equations')).toMatchObject({ total: 2, correct: 1, pct: 50, status: 'needs-improvement' });
    expect(profile.needsImprovement[0]).toMatchObject({ skill: 'Quadratics', accuracy: 0, recommendedDifficulty: 1 });
    expect(loadProfile('haider').sessions[0].id).toBe('attempt-1');
  });

  it('is idempotent for a session id and keeps users isolated', () => {
    const results = computeResults(['profile-test::one'], { 'profile-test::one': 'A' });
    recordCompletedSession('haider', results, { sessionId: 'same' });
    const duplicate = recordCompletedSession('haider', results, { sessionId: 'same' });
    recordCompletedSession('sana', results, { sessionId: 'same' });

    expect(duplicate.summary.sessions).toBe(1);
    expect(loadProfile('sana').summary.sessions).toBe(1);
    expect(profileStorageKey('haider')).not.toBe(profileStorageKey('sana'));
  });

  it('uses the latest twenty attempts for adaptive tracks and can clear a profile', () => {
    const first = computeResults(['profile-test::one'], { 'profile-test::one': 'B' });
    const second = computeResults(['profile-test::one'], { 'profile-test::one': 'A' });
    for (let index = 0; index < 20; index += 1) recordCompletedSession('haider', first, { sessionId: `wrong-${index}` });
    recordCompletedSession('haider', second, { sessionId: 'right' });

    const profile = loadProfile('haider');
    expect(profile.skills[0]).toMatchObject({ total: 20, correct: 1, pct: 5, status: 'needs-improvement' });
    clearProfile('haider');
    expect(loadProfile('haider').summary.sessions).toBe(0);
  });
});
