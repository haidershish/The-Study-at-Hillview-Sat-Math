import type { Difficulty } from './types';
import type { TestResults } from './test/scoring';

const PROFILE_KEY_PREFIX = 'sat-math-lab-profile-v1:';
const RECENT_ATTEMPTS = 20;

export type MasteryStatus = 'needs-improvement' | 'developing' | 'on-track' | 'strong';

export interface ProfileAttempt {
  key: string;
  domain: string;
  skill: string;
  difficulty: Difficulty;
  answered: boolean;
  correct: boolean;
}

export interface ProfileSession {
  id: string;
  completedAt: string;
  total: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  attempts: ProfileAttempt[];
}

export interface MasteryBucket {
  label: string;
  total: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  pct: number;
  status: MasteryStatus;
}

export interface ImprovementRecommendation {
  skill: string;
  domain: string;
  attempts: number;
  correct: number;
  accuracy: number;
  status: 'needs-improvement';
  recommendedDifficulty: Difficulty;
  reason: string;
}

export interface ProfileSummary {
  sessions: number;
  questions: number;
  correct: number;
  pct: number;
  lastCompletedAt?: string;
}

export interface UserProfile {
  version: 1;
  userId: string;
  createdAt: string;
  updatedAt: string;
  sessions: ProfileSession[];
  summary: ProfileSummary;
  domains: MasteryBucket[];
  skills: MasteryBucket[];
  needsImprovement: ImprovementRecommendation[];
}

export interface RecordSessionOptions {
  sessionId?: string;
  completedAt?: string;
  storage?: Storage;
}

function storageOrDefault(storage?: Storage): Storage | undefined {
  return storage ?? (typeof localStorage === 'undefined' ? undefined : localStorage);
}

function userIdOf(value: string): string {
  const userId = value.trim();
  if (!userId) throw new Error('A user id is required to load a profile.');
  return userId;
}

export function profileStorageKey(userId: string): string {
  return `${PROFILE_KEY_PREFIX}${encodeURIComponent(userIdOf(userId))}`;
}

function now(): string {
  return new Date().toISOString();
}

function percentage(correct: number, total: number): number {
  return total ? Math.round((correct / total) * 100) : 0;
}

function statusFor(pct: number): MasteryStatus {
  if (pct < 60) return 'needs-improvement';
  if (pct < 80) return 'developing';
  if (pct < 90) return 'on-track';
  return 'strong';
}

function emptyProfile(userId: string, createdAt = now()): UserProfile {
  return {
    version: 1,
    userId,
    createdAt,
    updatedAt: createdAt,
    sessions: [],
    summary: { sessions: 0, questions: 0, correct: 0, pct: 0 },
    domains: [],
    skills: [],
    needsImprovement: [],
  };
}

function validDifficulty(value: unknown): value is Difficulty {
  return value === 1 || value === 2 || value === 3;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseAttempt(value: unknown): ProfileAttempt | undefined {
  if (!record(value)
    || typeof value.key !== 'string'
    || typeof value.domain !== 'string'
    || typeof value.skill !== 'string'
    || !validDifficulty(value.difficulty)
    || typeof value.answered !== 'boolean'
    || typeof value.correct !== 'boolean') return undefined;
  return {
    key: value.key,
    domain: value.domain,
    skill: value.skill,
    difficulty: value.difficulty,
    answered: value.answered,
    correct: value.answered && value.correct,
  };
}

function parseSession(value: unknown): ProfileSession | undefined {
  if (!record(value) || typeof value.id !== 'string' || typeof value.completedAt !== 'string' || !Array.isArray(value.attempts)) return undefined;
  const attempts = value.attempts.map(parseAttempt).filter((attempt): attempt is ProfileAttempt => Boolean(attempt));
  const total = typeof value.total === 'number' && value.total >= 0 ? value.total : attempts.length;
  const correct = typeof value.correct === 'number' && value.correct >= 0 ? value.correct : attempts.filter(attempt => attempt.correct).length;
  const unanswered = typeof value.unanswered === 'number' && value.unanswered >= 0 ? value.unanswered : attempts.filter(attempt => !attempt.answered).length;
  const incorrect = typeof value.incorrect === 'number' && value.incorrect >= 0 ? value.incorrect : Math.max(0, total - correct - unanswered);
  return { id: value.id, completedAt: value.completedAt, total, correct, incorrect, unanswered, attempts };
}

function sessionsOf(value: unknown): ProfileSession[] {
  if (!record(value) || !Array.isArray(value.sessions)) return [];
  return value.sessions.map(parseSession).filter((session): session is ProfileSession => Boolean(session));
}

function groupAttempts(sessions: ProfileSession[], field: 'domain' | 'skill'): Map<string, ProfileAttempt[]> {
  const groups = new Map<string, ProfileAttempt[]>();
  for (const session of sessions) {
    for (const attempt of session.attempts) {
      const label = attempt[field].trim();
      if (!label) continue;
      const attempts = groups.get(label) ?? [];
      attempts.push(attempt);
      groups.set(label, attempts);
    }
  }
  return groups;
}

function mastery(groups: Map<string, ProfileAttempt[]>): MasteryBucket[] {
  return [...groups.entries()].map(([label, allAttempts]) => {
    // ponytail: cap each track at recent attempts; add weighted history only when it becomes necessary.
    const attempts = allAttempts.slice(-RECENT_ATTEMPTS);
    const correct = attempts.filter(attempt => attempt.correct).length;
    const unanswered = attempts.filter(attempt => !attempt.answered).length;
    const total = attempts.length;
    const incorrect = total - correct - unanswered;
    const pct = percentage(correct, total);
    return { label, total, correct, incorrect, unanswered, pct, status: statusFor(pct) };
  }).sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
}

function recommendations(skills: Map<string, ProfileAttempt[]>): ImprovementRecommendation[] {
  return [...skills.entries()].flatMap(([skill, allAttempts]) => {
    const attempts = allAttempts.slice(-RECENT_ATTEMPTS);
    const correct = attempts.filter(attempt => attempt.correct).length;
    const total = attempts.length;
    const accuracy = percentage(correct, total);
    if (statusFor(accuracy) !== 'needs-improvement' || total === 0) return [];
    const latest = attempts[attempts.length - 1];
    const missed = total - correct;
    const recommendedDifficulty: Difficulty = accuracy < 40 ? 1 : 2;
    return [{
      skill,
      domain: latest.domain,
      attempts: total,
      correct,
      accuracy,
      status: 'needs-improvement' as const,
      recommendedDifficulty,
      reason: `${missed} of ${total} recent attempts need review (${accuracy}% correct).`,
    }];
  }).sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts || a.skill.localeCompare(b.skill));
}

function materialize(userId: string, createdAt: string, updatedAt: string, sessions: ProfileSession[]): UserProfile {
  const domains = mastery(groupAttempts(sessions, 'domain'));
  const skills = mastery(groupAttempts(sessions, 'skill'));
  const questions = sessions.reduce((sum, session) => sum + session.total, 0);
  const correct = sessions.reduce((sum, session) => sum + session.correct, 0);
  return {
    version: 1,
    userId,
    createdAt,
    updatedAt,
    sessions,
    summary: {
      sessions: sessions.length,
      questions,
      correct,
      pct: percentage(correct, questions),
      lastCompletedAt: sessions.at(-1)?.completedAt,
    },
    domains,
    skills,
    needsImprovement: recommendations(groupAttempts(sessions, 'skill')),
  };
}

export function loadProfile(userId: string, storage?: Storage): UserProfile {
  const id = userIdOf(userId);
  const source = storageOrDefault(storage);
  if (!source) return emptyProfile(id);
  try {
    const text = source.getItem(profileStorageKey(id));
    if (!text) return emptyProfile(id);
    const parsed: unknown = JSON.parse(text);
    if (!record(parsed)) return emptyProfile(id);
    const createdAt = typeof parsed.createdAt === 'string' ? parsed.createdAt : now();
    const updatedAt = typeof parsed.updatedAt === 'string' ? parsed.updatedAt : createdAt;
    return materialize(id, createdAt, updatedAt, sessionsOf(parsed));
  } catch {
    return emptyProfile(id);
  }
}

export function saveProfile(profile: UserProfile, storage?: Storage): void {
  const source = storageOrDefault(storage);
  if (!source) return;
  try {
    source.setItem(profileStorageKey(profile.userId), JSON.stringify({
      version: 1,
      userId: profile.userId,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      sessions: profile.sessions,
    }));
  } catch {
    /* localStorage may be unavailable or full; the in-memory profile remains usable. */
  }
}

function automaticSessionId(results: TestResults): string {
  const text = JSON.stringify(results.perQuestion.map(item => [item.key, item.response]));
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  return `auto-${(hash >>> 0).toString(36)}`;
}

export function recordCompletedSession(userId: string, results: TestResults, options: RecordSessionOptions = {}): UserProfile {
  const id = userIdOf(userId);
  const profile = loadProfile(id, options.storage);
  const sessionId = options.sessionId?.trim() || automaticSessionId(results);
  if (profile.sessions.some(session => session.id === sessionId)) return profile;

  const attempts: ProfileAttempt[] = results.perQuestion.map(item => ({
    key: item.key,
    domain: item.question.domain,
    skill: item.question.skill,
    difficulty: item.question.difficulty,
    answered: item.answered,
    correct: item.answered && item.correct,
  }));
  const completedAt = options.completedAt?.trim() || now();
  const session: ProfileSession = {
    id: sessionId,
    completedAt,
    total: results.total,
    correct: results.correct,
    incorrect: results.incorrect,
    unanswered: results.unanswered,
    attempts,
  };
  const next = materialize(id, profile.createdAt, completedAt, [...profile.sessions, session]);
  saveProfile(next, options.storage);
  return next;
}

export function clearProfile(userId: string, storage?: Storage): void {
  const source = storageOrDefault(storage);
  if (!source) return;
  source.removeItem(profileStorageKey(userId));
}
