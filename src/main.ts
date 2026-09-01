import DOMPurify from 'dompurify';
import './styles.css';
import type { Bank, Difficulty, Domain, Expression, Question, SessionState, TestConfig, TestMode } from './types';
import { DIFFICULTIES, DOMAINS } from './types';
import { allBanks, findQuestionByKey, initBanks, registerImportedBank, resetImportedBanks } from './questions/banks';
import { importQuestionFile } from './questions/importer';
import { importBankZip } from './questions/zip-import';
import { generateOrder, COUNT_OPTIONS } from './test/generator';
import { availableCount, computeResults } from './test/scoring';
import { exportState, initialState, loadState, nextColor, saveState } from './state/store';
import { selectCalculatorProvider } from './calculator/factory';
import { OpenSourceCalculatorProvider, type OpenSourceState } from './calculator/opensource-provider';
import { DesmosCalculatorProvider } from './calculator/desmos-provider';
import type { CalculatorExpression, CalculatorProvider, ProviderInfo } from './calculator/types';
import { strategyAngleMode, strategyNeedsDesmos, strategyToExpressions } from './questions/strategy';
import { preloadImages, renderAssetsHTML, wireAssets } from './questions/images';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Application root was not found.');

app.innerHTML = `
  <section id="screen-home" class="screen screen-home"></section>
  <section id="screen-test" class="screen screen-test" hidden>
    <header class="topbar">
      <a class="brand" href="#" id="home-link" aria-label="SAT Math Lab home"><span class="brand-mark">∿</span><span>SAT Math Lab</span></a>
      <div class="module-name"><span class="live-dot"></span> Digital SAT · Math Practice</div>
      <div class="top-actions">
        <button class="timer" id="timer" aria-label="Hide timer">35:00</button>
        <button class="quiet" id="reference-button">Reference</button>
        <button class="primary" id="calculator-toggle" aria-expanded="true">Calculator</button>
        <button class="quiet icon-button" id="tools-button" aria-label="More tools">•••</button>
      </div>
    </header>
    <main class="workspace">
      <section class="question-panel" aria-label="Question">
        <div class="question-meta">
          <div><strong id="question-position"></strong><span class="domain-pill" id="domain"></span><span class="bank-pill" id="bank-label"></span></div>
          <button class="review" id="review-button">☆ Mark for review</button>
        </div>
        <article id="question"></article>
        <div class="question-tip" id="question-tip" hidden></div>
      </section>
      <aside class="calculator-panel" id="calculator-panel" aria-label="Calculator">
        <div class="calculator-header">
          <div><strong>Calculator</strong><small id="provider-status">Loading calculator…</small></div>
          <div class="calculator-header-actions">
            <button class="quiet" id="angle-toggle" aria-pressed="false" title="Currently in radians — click for degrees">RAD</button>
            <button class="quiet" id="reset-graph">Reset view</button>
            <button class="quiet" id="send-setup" hidden>Send setup to calculator</button>
          </div>
        </div>
        <div class="calculator-mount" id="calculator-mount" aria-live="polite"></div>
      </aside>
    </main>
    <nav class="bottombar" aria-label="Question navigation">
      <button class="quiet" id="back">← Back</button>
      <button class="question-menu-button" id="question-menu-button">☰ <span id="nav-position"></span></button>
      <div class="question-menu" id="question-menu" hidden></div>
      <button class="primary" id="next">Next →</button>
    </nav>
  </section>
  <section id="screen-results" class="screen screen-results" hidden></section>
  <dialog id="dialog"><div class="dialog-heading"><h2 id="dialog-title"></h2><button id="dialog-close" aria-label="Close">×</button></div><div id="dialog-body"></div></dialog>
  <input id="question-file" type="file" accept=".json,application/json" hidden>
  <input id="bank-zip-file" type="file" accept=".zip,application/zip" hidden>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>
`;

const $ = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element: ${id}`);
  return element as T;
};

let state: SessionState = loadState();
let provider: CalculatorProvider | null = null;
let providerInfo: ProviderInfo = { id: 'open-source', status: 'loading', ready: false, label: 'Loading calculator…', detail: '', degraded: false };
let timer: number | undefined;

const clean = (value: string): string => DOMPurify.sanitize(value, { ALLOWED_TAGS: [] });
const persist = () => saveState(state);
const toast = (message: string, error = false) => {
  const node = $('toast');
  node.textContent = message;
  node.className = `toast show${error ? ' error' : ''}`;
  window.setTimeout(() => node.className = 'toast', 3200);
};

// ---- expression model conversion ------------------------------------------

const toCalcExpression = (expression: Expression): CalculatorExpression => ({
  id: expression.id, source: expression.source, latex: expression.source, color: expression.color, visible: expression.visible,
});
const fromCalcExpression = (expression: CalculatorExpression, index: number): Expression => ({
  id: expression.id, source: expression.source ?? '', color: expression.color ?? nextColor(index), visible: expression.visible !== false,
});

// ---- home selection (transient form state) ---------------------------------

interface HomeSelection {
  mode: TestMode;
  bankIds: string[];
  domainFilters: Domain[];
  difficultyFilters: Difficulty[];
  questionCount: number | 'full' | 'custom';
  customCount: number;
  seed: string;
  domainBalanced: boolean;
}

let home: HomeSelection = {
  mode: 'bank',
  bankIds: ['questions-2'],
  domainFilters: [],
  difficultyFilters: [],
  questionCount: 'full',
  customCount: 10,
  seed: '',
  domainBalanced: false,
};

// ---- screen routing --------------------------------------------------------

function showScreen(name: 'home' | 'test' | 'results'): void {
  $('screen-home').hidden = name !== 'home';
  $('screen-test').hidden = name !== 'test';
  $('screen-results').hidden = name !== 'results';
  if (name === 'test') window.setTimeout(() => provider?.resize(), 60);
}

function currentResolved(): { bank: Bank; question: Question } | undefined {
  const key = state.order[state.current];
  return key ? findQuestionByKey(key) : undefined;
}

// ---- home screen -----------------------------------------------------------

function renderHome(): void {
  const banks = allBanks();
  const hasActive = state.order.length > 0 && state.screen !== 'home';

  const modeOptions: Array<{ value: TestMode; label: string; hint: string }> = [
    { value: 'bank', label: 'Single bank', hint: 'Practice one bank in order.' },
    { value: 'combined', label: 'Combined', hint: 'All selected banks, in order.' },
    { value: 'random', label: 'Random practice', hint: 'Shuffled questions from selected banks.' },
  ];

  const bankCards = banks.map(bank => {
    const domains = [...new Set(bank.questions.map(q => q.domain))].join(', ');
    const difficulties = [...new Set(bank.questions.map(q => q.difficulty))].sort().map(d => `L${d}`).join(' ');
    return `
      <label class="bank-card ${home.bankIds.includes(bank.id) ? 'selected' : ''}">
        <input type="checkbox" class="bank-check" value="${bank.id}" ${home.bankIds.includes(bank.id) ? 'checked' : ''}>
        <span class="bank-card-title">${clean(bank.title)}</span>
        <span class="bank-card-desc">${clean(bank.description)}</span>
        <span class="bank-card-meta">${bank.questions.length} questions · ${domains || '—'}</span>
        <span class="bank-card-diff">${difficulties || ''}${bank.builtin ? '' : ' · imported'}</span>
      </label>`;
  }).join('');

  const domainFilters = DOMAINS.map(domain => `
    <label class="filter-chip ${home.domainFilters.includes(domain) ? 'on' : ''}"><input type="checkbox" class="domain-filter" value="${domain}" ${home.domainFilters.includes(domain) ? 'checked' : ''}>${domain}</label>`).join('');

  const difficultyFilters = DIFFICULTIES.map(d => `
    <label class="filter-chip ${home.difficultyFilters.includes(d) ? 'on' : ''}"><input type="checkbox" class="difficulty-filter" value="${d}" ${home.difficultyFilters.includes(d) ? 'checked' : ''}>Level ${d}</label>`).join('');

  const countOptions = COUNT_OPTIONS.map(option => {
    const value = String(option);
    const label = option === 'full' ? 'Full pool' : option === 'custom' ? 'Custom' : `${option}`;
    const selected = String(home.questionCount) === value;
    return `<label class="filter-chip ${selected ? 'on' : ''}"><input type="radio" name="count" class="count-option" value="${value}" ${selected ? 'checked' : ''}>${label}</label>`;
  }).join('');

  $('screen-home').innerHTML = `
    <header class="home-hero">
      <div class="brand home-brand"><span class="brand-mark">∿</span><span>SAT Math Lab</span></div>
      <div class="home-status"><span class="provider-dot ${providerInfo.id === 'desmos' ? 'desmos' : providerInfo.degraded ? 'degraded' : ''}"></span>${clean(providerInfo.label)}</div>
    </header>
    <main class="home-main">
      <h1>Build your practice test</h1>
      ${hasActive ? `<button class="resume-card" id="resume-session"><strong>Resume active session</strong><span>${state.order.length} questions · ${state.responses ? Object.values(state.responses).filter(Boolean).length : 0} answered</span></button>` : ''}

      <section class="home-section">
        <h2>Mode</h2>
        <div class="mode-row">${modeOptions.map(m => `<label class="mode-card ${home.mode === m.value ? 'selected' : ''}"><input type="radio" name="mode" class="mode-option" value="${m.value}" ${home.mode === m.value ? 'checked' : ''}><strong>${m.label}</strong><span>${m.hint}</span></label>`).join('')}</div>
      </section>

      <section class="home-section">
        <h2>Question banks</h2>
        <div class="bank-grid">${bankCards}</div>
      </section>

      <section class="home-section">
        <h2>Domains</h2>
        <div class="chip-row">${domainFilters}</div>
      </section>

      <section class="home-section">
        <h2>Difficulty</h2>
        <div class="chip-row">${difficultyFilters}</div>
      </section>

      <section class="home-section">
        <h2>Question count</h2>
        <div class="chip-row">${countOptions}</div>
        <label class="custom-count" id="custom-count-row" ${home.questionCount === 'custom' ? '' : 'hidden'}>Number of questions <input type="number" id="custom-count" min="1" max="200" value="${home.customCount}"></label>
      </section>

      <section class="home-section" id="random-options" ${home.mode === 'random' ? '' : 'hidden'}>
        <h2>Random options</h2>
        <div class="random-options">
          <label class="seed-field">Seed (optional) <input type="text" id="seed-input" value="${clean(home.seed)}" placeholder="e.g. 42"></label>
          <label class="filter-chip ${home.domainBalanced ? 'on' : ''}"><input type="checkbox" id="domain-balanced" ${home.domainBalanced ? 'checked' : ''}>Balance across domains</label>
        </div>
      </section>

      <div class="home-actions">
        <button class="primary" id="start-test" ${availableCount(banks, home.bankIds, home.domainFilters, home.difficultyFilters) === 0 ? 'disabled' : ''}>Start test <span id="available-count"></span></button>
        <div class="import-row">
          <button class="quiet" id="import-zip">Import bank (ZIP)</button>
          <button class="quiet" id="import-json">Import bank (JSON)</button>
        </div>
      </div>
    </main>`;

  updateHomeCount();
  bindHomeEvents();
}

function updateHomeCount(): void {
  const banks = allBanks();
  const count = availableCount(banks, home.bankIds, home.domainFilters, home.difficultyFilters);
  const el = document.getElementById('available-count');
  if (el) el.textContent = `(${count} available)`;
  const start = document.getElementById('start-test');
  if (start) start.toggleAttribute('disabled', count === 0);
}

function bindHomeEvents(): void {
  document.querySelectorAll('.mode-option').forEach(input => input.addEventListener('change', () => {
    home.mode = (input as HTMLInputElement).value as TestMode;
    renderHome();
  }));
  document.querySelectorAll('.bank-check').forEach(input => input.addEventListener('change', () => {
    const value = (input as HTMLInputElement).value;
    if (home.mode === 'bank') home.bankIds = (input as HTMLInputElement).checked ? [value] : [];
    else if ((input as HTMLInputElement).checked) home.bankIds = [...new Set([...home.bankIds, value])];
    else home.bankIds = home.bankIds.filter(id => id !== value);
    if (home.mode === 'bank' && home.bankIds.length === 0) renderHome();
    else { renderHome(); }
  }));
  document.querySelectorAll('.domain-filter').forEach(input => input.addEventListener('change', () => {
    const value = (input as HTMLInputElement).value as Domain;
    home.domainFilters = (input as HTMLInputElement).checked ? [...home.domainFilters, value] : home.domainFilters.filter(d => d !== value);
    updateHomeCount();
    (input as HTMLInputElement).closest('.filter-chip')?.classList.toggle('on', (input as HTMLInputElement).checked);
  }));
  document.querySelectorAll('.difficulty-filter').forEach(input => input.addEventListener('change', () => {
    const value = Number((input as HTMLInputElement).value) as Difficulty;
    home.difficultyFilters = (input as HTMLInputElement).checked ? [...home.difficultyFilters, value] : home.difficultyFilters.filter(d => d !== value);
    updateHomeCount();
    (input as HTMLInputElement).closest('.filter-chip')?.classList.toggle('on', (input as HTMLInputElement).checked);
  }));
  document.querySelectorAll('.count-option').forEach(input => input.addEventListener('change', () => {
    const value = (input as HTMLInputElement).value;
    home.questionCount = value === 'full' ? 'full' : value === 'custom' ? 'custom' : Number(value);
    renderHome();
  }));
  document.getElementById('custom-count')?.addEventListener('input', event => {
    home.customCount = Math.max(1, Number((event.target as HTMLInputElement).value) || 1);
  });
  document.getElementById('seed-input')?.addEventListener('input', event => {
    home.seed = (event.target as HTMLInputElement).value.trim();
  });
  document.getElementById('domain-balanced')?.addEventListener('change', event => {
    home.domainBalanced = (event.target as HTMLInputElement).checked;
    (event.target as HTMLInputElement).closest('.filter-chip')?.classList.toggle('on', (event.target as HTMLInputElement).checked);
  });
  document.getElementById('start-test')?.addEventListener('click', () => startTest());
  document.getElementById('resume-session')?.addEventListener('click', () => {
    if (state.screen === 'results') showResults();
    else { showScreen('test'); renderQuestion(); }
  });
  document.getElementById('import-zip')?.addEventListener('click', () => $('bank-zip-file').click());
  document.getElementById('import-json')?.addEventListener('click', () => $('question-file').click());
  document.getElementById('home-link')?.addEventListener('click', event => { event.preventDefault(); returnHome(); });
}

function buildConfig(): TestConfig {
  const count = home.questionCount === 'custom' ? Math.max(1, home.customCount) : home.questionCount;
  return {
    mode: home.mode,
    bankIds: home.bankIds,
    domainFilters: home.domainFilters,
    difficultyFilters: home.difficultyFilters,
    questionCount: count,
    seed: home.seed ? Number(home.seed) || undefined : undefined,
    domainBalanced: home.domainBalanced,
  };
}

function startTest(): void {
  const config = buildConfig();
  const order = generateOrder(allBanks(), config);
  if (order.length === 0) { toast('No questions match the selected filters.', true); return; }
  state.testConfig = config;
  state.order = order;
  state.current = 0;
  state.secondsRemaining = 35 * 60;
  state.timerHidden = false;
  state.responses = {};
  state.review = [];
  state.screen = 'test';
  persist();
  showScreen('test');
  renderQuestion();
  startTimer();
  ensureCalculatorMounted();
}

function returnHome(): void {
  stopTimer();
  state.screen = 'home';
  persist();
  showScreen('home');
  renderHome();
}

// ---- test screen -----------------------------------------------------------

function renderQuestion(): void {
  const resolved = currentResolved();
  if (!resolved) { showResults(); return; }
  const { bank, question: q } = resolved;
  const key = state.order[state.current];
  $('question-position').textContent = `Question ${state.current + 1} of ${state.order.length}`;
  $('nav-position').textContent = `${state.current + 1} of ${state.order.length}`;
  $('domain').textContent = q.domain;
  $('bank-label').textContent = bank.title;

  const marked = state.review.includes(key);
  $('review-button').textContent = `${marked ? '★' : '☆'} ${marked ? 'Marked for review' : 'Mark for review'}`;
  $('review-button').classList.toggle('marked', marked);

  const answer = state.responses[key] ?? '';
  const assets = renderAssetsHTML(q.assets);
  const controls = q.type === 'multiple-choice'
    ? `<div class="choices">${q.choices?.map(choice => `<label class="choice ${answer === choice.id ? 'selected' : ''}"><input type="radio" name="answer" value="${choice.id}" ${answer === choice.id ? 'checked' : ''}><span class="choice-letter">${choice.id}</span><span>${clean(choice.text)}</span></label>`).join('') ?? ''}</div>`
    : `<label class="spr-label">Enter your answer<input class="spr" id="spr" inputmode="decimal" value="${clean(answer)}" placeholder="Answer"></label>`;
  $('question').innerHTML = `<div class="skill-line">${clean(q.skill)} · Difficulty ${q.difficulty}</div><h1>${clean(q.prompt)}</h1>${assets}${controls}`;
  wireAssets($('question'));

  const tip = $('question-tip');
  const tipText = q.calculatorTip ?? q.calculatorStrategy?.instructions ?? '';
  tip.hidden = !tipText;
  tip.innerHTML = tipText ? `<strong>Calculator strategy</strong><br>${clean(tipText)}` : '';

  document.querySelectorAll<HTMLInputElement>('input[name="answer"]').forEach(input => input.addEventListener('change', () => {
    state.responses[key] = input.value; persist(); renderQuestion(); renderMenu();
  }));
  document.getElementById('spr')?.addEventListener('input', event => {
    state.responses[key] = (event.target as HTMLInputElement).value; persist(); renderMenu();
  });

  renderMenu();
  updateSetupButton();
  preloadNext();
}

function preloadNext(): void {
  const nextKey = state.order[state.current + 1];
  if (!nextKey) return;
  const resolved = findQuestionByKey(nextKey);
  if (resolved) preloadImages(resolved.question.assets);
}

function renderMenu(): void {
  $('question-menu').innerHTML = state.order.map((key, index) => {
    const resolved = findQuestionByKey(key);
    const skill = resolved ? resolved.question.skill : '—';
    return `<button data-index="${index}" class="${index === state.current ? 'current' : ''}"><span>${index + 1}</span><span>${clean(skill)}</span><b>${state.responses[key] ? '✓' : ''}${state.review.includes(key) ? ' ★' : ''}</b></button>`;
  }).join('');
}

function navigate(index: number): void {
  state.current = Math.max(0, Math.min(state.order.length - 1, index));
  persist(); renderQuestion(); $('question-menu').hidden = true;
}

function updateSetupButton(): void {
  const resolved = currentResolved();
  $('send-setup').hidden = !resolved?.question.calculatorStrategy;
}

function updateAngleToggle(): void {
  const button = $('angle-toggle');
  const degrees = state.angleMode === 'degrees';
  button.textContent = degrees ? 'DEG' : 'RAD';
  button.title = degrees ? 'Currently in degrees — click for radians' : 'Currently in radians — click for degrees';
  button.setAttribute('aria-pressed', String(degrees));
}

function updateProviderStatus(): void {
  const node = $('provider-status');
  node.textContent = providerInfo.label;
  node.classList.toggle('degraded', providerInfo.degraded);
  const dotClass = providerInfo.id === 'desmos' ? 'desmos' : providerInfo.degraded ? 'degraded' : '';
  document.querySelectorAll<HTMLElement>('.home-status').forEach(el => {
    el.innerHTML = `<span class="provider-dot ${dotClass}"></span>${clean(providerInfo.label)}`;
  });
}

function updateTimer(): void {
  const minutes = Math.floor(state.secondsRemaining / 60);
  const seconds = String(state.secondsRemaining % 60).padStart(2, '0');
  $('timer').textContent = state.timerHidden ? 'Show timer' : `${minutes}:${seconds}`;
}

function startTimer(): void {
  stopTimer();
  timer = window.setInterval(() => {
    if (state.secondsRemaining > 0) { state.secondsRemaining -= 1; updateTimer(); if (state.secondsRemaining % 10 === 0) persist(); }
    else { stopTimer(); toast('Time is up.'); showResults(); }
  }, 1000);
}

function stopTimer(): void {
  if (timer) { window.clearInterval(timer); timer = undefined; }
}

function finishTest(): void {
  showResults();
}

function showResults(): void {
  stopTimer();
  state.screen = 'results';
  persist();
  showScreen('results');
  renderResults();
}

// ---- results screen --------------------------------------------------------

function renderResults(): void {
  const results = computeResults(state.order, state.responses);
  const bucket = (title: string, items: { label: string; correct: number; total: number; pct: number }[]) => `
    <section class="result-section">
      <h3>${title}</h3>
      ${items.length ? items.map(item => `
        <div class="result-row"><span class="result-label">${clean(item.label)}</span><div class="result-bar"><div style="width:${item.pct}%"></div></div><span class="result-count">${item.correct}/${item.total}</span></div>`).join('') : '<p class="muted">No data.</p>'}
    </section>`;

  const review = results.perQuestion.map((item, index) => {
    const right = item.correct;
    const status = !item.answered ? 'Unanswered' : right ? 'Correct' : 'Incorrect';
    return `<details><summary><span>${index + 1}. ${clean(item.question.skill)}</span><b class="${item.correct ? 'right' : item.answered ? 'wrong' : 'muted'}">${status}</b></summary><p>Your answer: ${clean(item.response || '—')} · Correct answer: ${clean(item.question.answer)}</p><p>${clean(item.question.explanation)}</p></details>`;
  }).join('');

  $('screen-results').innerHTML = `
    <header class="results-header">
      <div class="brand"><span class="brand-mark">∿</span><span>SAT Math Lab</span></div>
      <button class="primary" id="return-home">Back to home</button>
    </header>
    <main class="results-main">
      <div class="score-hero">
        <div class="score-big">${results.correct}<span>/${results.total}</span></div>
        <div class="score-meta">
          <div class="score-pct">${results.pct}%</div>
          <div class="score-split">${results.correct} correct · ${results.incorrect} incorrect · ${results.unanswered} unanswered</div>
        </div>
      </div>
      <div class="results-grid">
        ${bucket('Domain performance', results.domains)}
        ${bucket('Difficulty performance', results.difficulties.map(d => ({ ...d, label: `Level ${d.label}` })))}
        ${bucket('Bank performance', results.banks)}
        ${bucket('Skill performance', results.skills)}
      </div>
      <section class="result-section"><h3>Review answers</h3>${review}</section>
    </main>`;

  document.getElementById('return-home')?.addEventListener('click', returnHome);
}

// ---- dialogs / reference / tools -------------------------------------------

function showDialog(title: string, body: string): void {
  $('dialog-title').textContent = title;
  $('dialog-body').innerHTML = body;
  ($('dialog') as HTMLDialogElement).showModal();
}

function showReference(): void {
  showDialog('Digital SAT Math Reference', `<div class="reference-grid">
    <section><h3>Areas and volumes</h3><p>Circle: A = πr²</p><p>Triangle: A = ½bh</p><p>Rectangle: A = lw</p><p>Rectangular prism: V = lwh</p><p>Cylinder: V = πr²h</p></section>
    <section><h3>Algebra and geometry</h3><p>Slope: m = (y₂−y₁)/(x₂−x₁)</p><p>Quadratic formula: x = (−b ± √(b²−4ac))/(2a)</p><p>Pythagorean theorem: a²+b²=c²</p><p>Arc length: (θ/360)·2πr</p></section>
    <section><h3>Special triangles</h3><p>45°–45°–90°: x, x, x√2</p><p>30°–60°–90°: x, x√3, 2x</p><p>Circle: 360° = 2π radians</p></section>
  </div>`);
}

function showTools(): void {
  showDialog('Classroom tools', `<div class="tool-list">
    <button class="tool-card" data-tool="export"><strong>Export session</strong><span>Download answers, review flags and calculator state.</span></button>
    <button class="tool-card" data-tool="score"><strong>Score this practice</strong><span>See results and explanations.</span></button>
    <button class="tool-card danger" data-tool="reset"><strong>Reset session</strong><span>Clear answers and return to the home screen.</span></button>
  </div>`);
}

// ---- calculator strategy + lifecycle ---------------------------------------

function providerHasExpressions(): boolean {
  if (!provider) return false;
  const value = provider.getState() as { expressions?: unknown } | { list?: unknown } | null;
  if (!value || typeof value !== 'object') return false;
  if ('expressions' in value && Array.isArray((value as { expressions: unknown }).expressions)) {
    return ((value as { expressions: unknown[] }).expressions).length > 0;
  }
  const desmos = value as { expressions?: { list?: unknown[] } };
  return (desmos.expressions?.list?.length ?? 0) > 0;
}

function applyStrategy(): void {
  if (!provider) return;
  const calc = provider;
  const resolved = currentResolved();
  const strategy = resolved?.question.calculatorStrategy;
  if (!strategy) return;

  if (strategyNeedsDesmos(strategy) && calc.id !== 'desmos') {
    toast('This setup requires the official Desmos calculator, which is not available right now.', true);
    return;
  }

  const expressions = strategyToExpressions(strategy);
  const replace = !providerHasExpressions() || window.confirm('Replace your current calculator expressions with this question setup?');
  if (replace) {
    calc.setExpressions(expressions);
    if (calc.id === 'open-source') state.expressions = expressions.map(fromCalcExpression);
  } else {
    expressions.forEach(expression => calc.addExpression(expression));
  }

  const mode = strategyAngleMode(strategy);
  if (mode) { state.angleMode = mode; calc.setAngleMode(mode); updateAngleToggle(); persist(); }
  toast(strategy.instructions);
}

async function ensureCalculatorMounted(): Promise<void> {
  if (!provider) return;
  if (!provider.ready) {
    try {
      await provider.mount($('calculator-mount'));
    } catch (error) {
      provider = new OpenSourceCalculatorProvider({ onChange: onOpenSourceChange });
      providerInfo = { id: 'open-source', status: 'desmos-unavailable', ready: true, degraded: true, label: 'Desmos unavailable — offline calculator active', detail: error instanceof Error ? error.message : 'Desmos could not start.' };
      updateProviderStatus();
      await provider.mount($('calculator-mount'));
    }
  }
  // Re-seed the provider from session state (idempotent; state stays in sync).
  if (provider.id === 'open-source') {
    provider.setState({ expressions: state.expressions.map(toCalcExpression), angleMode: state.angleMode, tableRows: state.tableRows, connectPoints: state.connectPoints });
  } else {
    if (state.calculatorState) provider.setState(state.calculatorState);
    provider.setAngleMode(state.angleMode);
  }
  updateAngleToggle();
}

function onOpenSourceChange(calcState: OpenSourceState): void {
  state.expressions = calcState.expressions.map(fromCalcExpression);
  state.angleMode = calcState.angleMode;
  state.tableRows = calcState.tableRows;
  state.connectPoints = calcState.connectPoints;
  updateAngleToggle();
  persist();
}

async function selectProvider(): Promise<void> {
  const selected = await selectCalculatorProvider({
    createOpenSource: () => new OpenSourceCalculatorProvider({ onChange: onOpenSourceChange }),
    createDesmos: () => new DesmosCalculatorProvider({ onChange: (calculatorState) => {
      state.calculatorState = calculatorState;
      const graph = (calculatorState as { graph?: { degreeMode?: boolean } } | null)?.graph;
      if (graph && typeof graph.degreeMode === 'boolean') { state.angleMode = graph.degreeMode ? 'degrees' : 'radians'; updateAngleToggle(); }
      persist();
    } }),
  });
  provider = selected.provider;
  providerInfo = selected.info;
  updateProviderStatus();
}

// ---- imports ---------------------------------------------------------------

async function importJsonBank(file: File): Promise<void> {
  const questions = await importQuestionFile(file);
  const id = file.name.replace(/\.json$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'imported-bank';
  registerImportedBank({ id, title: file.name.replace(/\.json$/i, ''), description: `${questions.length} imported questions.`, questions, assetBase: '' });
  toast(`${questions.length} questions imported as "${file.name.replace(/\.json$/i, '')}".`);
  renderHome();
}

async function importZipBank(file: File): Promise<void> {
  const { bank } = await importBankZip(file);
  registerImportedBank(bank);
  toast(`Imported bank "${bank.title}" (${bank.questions.length} questions).`);
  renderHome();
}

// ---- events ----------------------------------------------------------------

function bindEvents(): void {
  $('review-button').addEventListener('click', () => {
    const key = state.order[state.current];
    if (!key) return;
    state.review = state.review.includes(key) ? state.review.filter(v => v !== key) : [...state.review, key];
    persist(); renderQuestion();
  });
  $('back').addEventListener('click', () => navigate(state.current - 1));
  $('next').addEventListener('click', () => state.current === state.order.length - 1 ? finishTest() : navigate(state.current + 1));
  $('question-menu-button').addEventListener('click', () => $('question-menu').hidden = !$('question-menu').hidden);
  $('question-menu').addEventListener('click', event => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-index]');
    if (button) navigate(Number(button.dataset.index));
  });
  $('timer').addEventListener('click', () => { state.timerHidden = !state.timerHidden; persist(); updateTimer(); });
  $('reference-button').addEventListener('click', showReference);
  $('tools-button').addEventListener('click', showTools);
  $('calculator-toggle').addEventListener('click', () => {
    const hidden = $('calculator-panel').classList.toggle('closed');
    $('calculator-toggle').setAttribute('aria-expanded', String(!hidden));
    if (!hidden) window.setTimeout(() => provider?.resize(), 60);
  });
  $('angle-toggle').addEventListener('click', () => {
    if (!provider) return;
    const next = state.angleMode === 'degrees' ? 'radians' : 'degrees';
    state.angleMode = next;
    provider.setAngleMode(next);
    updateAngleToggle(); persist();
  });
  $('send-setup').addEventListener('click', applyStrategy);
  $('reset-graph').addEventListener('click', () => provider?.resetViewport());
  $('dialog-close').addEventListener('click', () => ($('dialog') as HTMLDialogElement).close());
  $('dialog').addEventListener('click', event => { if (event.target === $('dialog')) ($('dialog') as HTMLDialogElement).close(); });
  $('dialog-body').addEventListener('click', event => {
    const tool = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-tool]')?.dataset.tool;
    if (tool === 'export') { exportState(state); toast('Session exported.'); }
    if (tool === 'score') showResults();
    if (tool === 'reset' && window.confirm('Clear this session and return to the home screen?')) {
      state = initialState();
      state.screen = 'home';
      resetImportedBanks();
      persist();
      ($('dialog') as HTMLDialogElement).close();
      stopTimer();
      showScreen('home');
      renderHome();
    }
  });
  $('question-file').addEventListener('change', async event => {
    const file = (event.target as HTMLInputElement).files?.[0];
    (event.target as HTMLInputElement).value = '';
    if (!file) return;
    try { await importJsonBank(file); }
    catch (error) { toast(error instanceof Error ? error.message : 'Import failed.', true); }
  });
  $('bank-zip-file').addEventListener('change', async event => {
    const file = (event.target as HTMLInputElement).files?.[0];
    (event.target as HTMLInputElement).value = '';
    if (!file) return;
    try { await importZipBank(file); }
    catch (error) { toast(error instanceof Error ? error.message : 'Import failed.', true); }
  });
  $('home-link').addEventListener('click', event => { event.preventDefault(); returnHome(); });
}

// ---- boot ------------------------------------------------------------------

function boot(): void {
  initBanks();
  bindEvents();
  updateTimer();
  showScreen('home');
  renderHome();
  void selectProvider();
}

boot();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined));
}
