import type { Bank, Domain, TestConfig } from '../types';
import { questionKey } from '../types';

export interface QuestionRef { bankId: string; question: { id: string; domain: Domain; difficulty: 1 | 2 | 3 } }

export const COUNT_OPTIONS: Array<number | 'full' | 'custom'> = [5, 10, 15, 20, 25, 'full', 'custom'];

/** Deterministic seeded PRNG (mulberry32) for reproducible random order. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates shuffle (returns a new array). */
export function fisherYates<T>(items: T[], random: () => number = Math.random): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Round-robin across domains so each domain is evenly represented. */
export function domainBalancedSelection<T extends QuestionRef>(pool: T[], count: number, random: () => number = Math.random): T[] {
  const byDomain = new Map<Domain, T[]>();
  for (const ref of pool) {
    const domain = ref.question.domain;
    if (!byDomain.has(domain)) byDomain.set(domain, []);
    byDomain.get(domain)!.push(ref);
  }
  for (const group of byDomain.values()) fisherYates(group, random);
  const domains = [...byDomain.keys()];
  const result: T[] = [];
  let index = 0;
  while (result.length < count && domains.length > 0) {
    const domain = domains[index % domains.length];
    const item = byDomain.get(domain)?.shift();
    if (item) result.push(item);
    index += 1;
    if (byDomain.get(domain)?.length === 0) {
      // Remove exhausted domain from the rotation.
      const remaining = domains.filter(d => (byDomain.get(d)?.length ?? 0) > 0);
      if (remaining.length === 0) break;
      domains.splice(0, domains.length, ...remaining);
      index = index % domains.length;
    }
  }
  return result;
}

/** Filter selected banks by domain/difficulty, deduped by bankId::questionId. */
export function buildPool(banks: Bank[], config: Pick<TestConfig, 'bankIds' | 'domainFilters' | 'difficultyFilters'>): QuestionRef[] {
  const selectedBanks = banks.filter(bank => config.bankIds.length === 0 || config.bankIds.includes(bank.id));
  const seen = new Set<string>();
  const pool: QuestionRef[] = [];
  for (const bank of selectedBanks) {
    for (const question of bank.questions) {
      if (config.domainFilters.length && !config.domainFilters.includes(question.domain)) continue;
      if (config.difficultyFilters.length && !config.difficultyFilters.includes(question.difficulty)) continue;
      const key = questionKey(bank.id, question.id);
      if (seen.has(key)) continue;
      seen.add(key);
      pool.push({ bankId: bank.id, question });
    }
  }
  return pool;
}

/**
 * Produce the ordered list of question keys for a test.
 *
 * - bank / combined: preserve natural order, limited to the requested count.
 * - random: Fisher–Yates shuffle (optionally seeded, optionally domain-balanced).
 *
 * The result is stored in the session so the order is stable across refresh.
 */
export function generateOrder(banks: Bank[], config: TestConfig): string[] {
  const pool = buildPool(banks, config);
  const limit = config.questionCount === 'full' ? pool.length : Math.min(config.questionCount, pool.length);

  let selected: QuestionRef[];
  if (config.mode === 'random') {
    const random = config.seed !== undefined ? seededRandom(config.seed) : Math.random;
    selected = config.domainBalanced
      ? domainBalancedSelection(pool, limit, random)
      : fisherYates(pool, random).slice(0, limit);
  } else {
    selected = pool.slice(0, limit);
  }

  return selected.map(ref => questionKey(ref.bankId, ref.question.id));
}
