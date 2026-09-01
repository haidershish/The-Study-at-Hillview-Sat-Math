import DOMPurify from 'dompurify';
import './styles.css';
import type { Expression, Question, SessionState } from './types';
import { sampleQuestions } from './questions/sample';
import { importQuestionFile } from './questions/importer';
import { exportState, initialState, loadState, nextColor, saveState } from './state/store';
import { selectCalculatorProvider } from './calculator/factory';
import { OpenSourceCalculatorProvider } from './calculator/opensource-provider';
import { DesmosCalculatorProvider } from './calculator/desmos-provider';
import type { CalculatorExpression, CalculatorProvider, ProviderInfo } from './calculator/types';
import { strategyAngleMode, strategyNeedsDesmos, strategyToExpressions } from './questions/strategy';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Application root was not found.');

app.innerHTML = `
  <header class="topbar">
    <a class="brand" href="#" aria-label="SAT Math Lab home"><span class="brand-mark">∿</span><span>SAT Math Lab</span></a>
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
        <div><strong id="question-position"></strong><span class="domain-pill" id="domain"></span></div>
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
  <dialog id="dialog"><div class="dialog-heading"><h2 id="dialog-title"></h2><button id="dialog-close" aria-label="Close">×</button></div><div id="dialog-body"></div></dialog>
  <input id="question-file" type="file" accept=".json,application/json" hidden>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>
`;

const $ = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element: ${id}`);
  return element as T;
};

let questions: Question[] = sampleQuestions;
let state: SessionState = loadState();
if (state.current >= questions.length) state.current = 0;

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

// ---- expression model conversion (persisted state <-> provider) ------------

const toCalcExpression = (expression: Expression): CalculatorExpression => ({
  id: expression.id,
  source: expression.source,
  latex: expression.source,
  color: expression.color,
  visible: expression.visible,
});

const fromCalcExpression = (expression: CalculatorExpression, index: number): Expression => ({
  id: expression.id,
  source: expression.source ?? '',
  color: expression.color ?? nextColor(index),
  visible: expression.visible !== false,
});

// ---- provider status + angle-mode UI --------------------------------------

function updateProviderStatus(): void {
  const node = $('provider-status');
  node.textContent = providerInfo.label;
  node.classList.toggle('degraded', providerInfo.degraded);
}

function updateAngleToggle(): void {
  const button = $('angle-toggle');
  const degrees = state.angleMode === 'degrees';
  button.textContent = degrees ? 'DEG' : 'RAD';
  button.title = degrees ? 'Currently in degrees — click for radians' : 'Currently in radians — click for degrees';
  button.setAttribute('aria-pressed', String(degrees));
}

function updateSetupButton(): void {
  $('send-setup').hidden = !questions[state.current].calculatorStrategy;
}

// ---- question rendering ----------------------------------------------------

function renderQuestion(): void {
  const q = questions[state.current];
  $('question-position').textContent = `Question ${state.current + 1} of ${questions.length}`;
  $('nav-position').textContent = `${state.current + 1} of ${questions.length}`;
  $('domain').textContent = q.domain;
  const marked = state.review.includes(q.id);
  $('review-button').textContent = `${marked ? '★' : '☆'} ${marked ? 'Marked for review' : 'Mark for review'}`;
  $('review-button').classList.toggle('marked', marked);

  const answer = state.responses[q.id] ?? '';
  const controls = q.type === 'multiple-choice'
    ? `<div class="choices">${q.choices?.map(choice => `<label class="choice ${answer === choice.id ? 'selected' : ''}"><input type="radio" name="answer" value="${choice.id}" ${answer === choice.id ? 'checked' : ''}><span class="choice-letter">${choice.id}</span><span>${clean(choice.text)}</span></label>`).join('') ?? ''}</div>`
    : `<label class="spr-label">Enter your answer<input class="spr" id="spr" inputmode="decimal" value="${clean(answer)}" placeholder="Answer"></label>`;
  $('question').innerHTML = `<div class="skill-line">${clean(q.skill)} · Difficulty ${q.difficulty}</div><h1>${clean(q.prompt)}</h1>${controls}`;
  const tip = $('question-tip');
  const tipText = q.calculatorTip ?? q.calculatorStrategy?.instructions ?? '';
  tip.hidden = !tipText;
  tip.innerHTML = tipText ? `<strong>Calculator strategy</strong><br>${clean(tipText)}` : '';

  document.querySelectorAll<HTMLInputElement>('input[name="answer"]').forEach(input => input.addEventListener('change', () => {
    state.responses[q.id] = input.value; persist(); renderQuestion(); renderMenu();
  }));
  document.getElementById('spr')?.addEventListener('input', event => {
    state.responses[q.id] = (event.target as HTMLInputElement).value; persist(); renderMenu();
  });
  renderMenu();
  updateSetupButton();
}

function renderMenu(): void {
  $('question-menu').innerHTML = questions.map((q, index) => `<button data-index="${index}" class="${index === state.current ? 'current' : ''}"><span>${index + 1}</span><span>${clean(q.skill)}</span><b>${state.responses[q.id] ? '✓' : ''}${state.review.includes(q.id) ? ' ★' : ''}</b></button>`).join('');
}

function navigate(index: number): void {
  state.current = Math.max(0, Math.min(questions.length - 1, index));
  persist(); renderQuestion(); $('question-menu').hidden = true;
}

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
    <button class="tool-card" data-tool="import"><strong>Import question bank</strong><span>Load validated JSON questions from your computer.</span></button>
    <button class="tool-card" data-tool="export"><strong>Export session</strong><span>Download answers, review flags and calculator expressions.</span></button>
    <button class="tool-card" data-tool="score"><strong>Score this practice</strong><span>See results and explanations.</span></button>
    <button class="tool-card danger" data-tool="reset"><strong>Reset session</strong><span>Clear answers and restore the sample lesson.</span></button>
  </div>`);
}

function showScore(): void {
  const correct = questions.filter(q => (state.responses[q.id] ?? '').trim().toLowerCase() === q.answer.trim().toLowerCase()).length;
  const review = questions.map((q, i) => {
    const response = state.responses[q.id] || 'No answer';
    const right = response.trim().toLowerCase() === q.answer.trim().toLowerCase();
    return `<details><summary><span>${i + 1}. ${clean(q.skill)}</span><b class="${right ? 'right' : 'wrong'}">${right ? 'Correct' : 'Review'}</b></summary><p>Your answer: ${clean(response)} · Correct answer: ${clean(q.answer)}</p><p>${clean(q.explanation)}</p></details>`;
  }).join('');
  showDialog(`Score: ${correct} of ${questions.length}`, `<div class="score-meter"><div style="width:${correct / questions.length * 100}%"></div></div>${review}`);
}

// ---- calculator strategy ---------------------------------------------------

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
  const q = questions[state.current];
  const strategy = q.calculatorStrategy;
  if (!strategy) return;

  if (strategyNeedsDesmos(strategy) && calc.id !== 'desmos') {
    toast('This setup requires the official Desmos calculator, which is not available right now.', true);
    return;
  }

  const expressions = strategyToExpressions(strategy);
  const replace = !providerHasExpressions() || window.confirm('Replace your current calculator expressions with this question setup?');
  if (replace) {
    calc.setExpressions(expressions);
    // setExpressions does not emit onChange for the open-source provider, so
    // mirror the new expression list back into session state.
    if (calc.id === 'open-source') state.expressions = expressions.map(fromCalcExpression);
  } else {
    expressions.forEach(expression => calc.addExpression(expression));
  }

  const mode = strategyAngleMode(strategy);
  if (mode) { state.angleMode = mode; calc.setAngleMode(mode); updateAngleToggle(); persist(); }
  toast(strategy.instructions);
}

// ---- calculator lifecycle --------------------------------------------------

/**
 * Re-seed the active provider from the current session state. Used after a
 * session reset or question-bank import so the calculator matches the restored
 * default expressions/angle mode (rather than clearing into an empty state).
 */
function restoreCalculator(): void {
  if (!provider) return;
  if (provider.id === 'open-source') {
    provider.setState({ expressions: state.expressions.map(toCalcExpression), angleMode: state.angleMode });
  } else {
    state.calculatorState = undefined;
    provider.clear();
    provider.resetViewport();
    provider.setAngleMode(state.angleMode);
  }
  updateAngleToggle();
}

async function initCalculator(): Promise<void> {
  const selected = await selectCalculatorProvider({
    createOpenSource: () => new OpenSourceCalculatorProvider({
      onChange: (expressions, angleMode) => {
        state.expressions = expressions.map(fromCalcExpression);
        state.angleMode = angleMode;
        updateAngleToggle();
        persist();
      },
    }),
    createDesmos: () => new DesmosCalculatorProvider({
      onChange: (calculatorState) => {
        state.calculatorState = calculatorState;
        const graph = (calculatorState as { graph?: { degreeMode?: boolean } } | null)?.graph;
        if (graph && typeof graph.degreeMode === 'boolean') {
          state.angleMode = graph.degreeMode ? 'degrees' : 'radians';
          updateAngleToggle();
        }
        persist();
      },
    }),
  });

  provider = selected.provider;
  providerInfo = selected.info;
  updateProviderStatus();

  try {
    await provider.mount($('calculator-mount'));
  } catch (error) {
    // If Desmos mount fails (e.g. runtime init error), fall back to open-source.
    provider = new OpenSourceCalculatorProvider({ onChange: (expressions, angleMode) => {
      state.expressions = expressions.map(fromCalcExpression);
      state.angleMode = angleMode; updateAngleToggle(); persist();
    } });
    providerInfo = { id: 'open-source', status: 'desmos-unavailable', ready: true, degraded: true, label: 'Desmos unavailable — offline calculator active', detail: error instanceof Error ? error.message : 'Desmos could not start.' };
    updateProviderStatus();
    await provider.mount($('calculator-mount'));
  }

  if (provider.id === 'open-source') {
    provider.setState({ expressions: state.expressions.map(toCalcExpression), angleMode: state.angleMode });
  } else {
    if (state.calculatorState) provider.setState(state.calculatorState);
    provider.setAngleMode(state.angleMode);
  }
  updateAngleToggle();
}

// ---- events ----------------------------------------------------------------

function bindEvents(): void {
  $('review-button').addEventListener('click', () => {
    const id = questions[state.current].id;
    state.review = state.review.includes(id) ? state.review.filter(value => value !== id) : [...state.review, id];
    persist(); renderQuestion();
  });
  $('back').addEventListener('click', () => navigate(state.current - 1));
  $('next').addEventListener('click', () => state.current === questions.length - 1 ? showScore() : navigate(state.current + 1));
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
    if (tool === 'import') $('question-file').click();
    if (tool === 'export') { exportState(state); toast('Session exported.'); }
    if (tool === 'score') showScore();
    if (tool === 'reset' && window.confirm('Clear this session and restore the sample questions?')) {
      state = initialState();
      questions = sampleQuestions;
      persist();
      restoreCalculator();
      ($('dialog') as HTMLDialogElement).close();
      renderAll();
    }
  });
  $('question-file').addEventListener('change', async event => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try { questions = await importQuestionFile(file); state = initialState(); persist(); restoreCalculator(); renderAll(); ($('dialog') as HTMLDialogElement).close(); toast(`${questions.length} questions imported.`); }
    catch (error) { toast(error instanceof Error ? error.message : 'Import failed.', true); }
  });
}

function updateTimer(): void {
  const minutes = Math.floor(state.secondsRemaining / 60);
  const seconds = String(state.secondsRemaining % 60).padStart(2, '0');
  $('timer').textContent = state.timerHidden ? 'Show timer' : `${minutes}:${seconds}`;
}

function renderAll(): void { renderQuestion(); updateAngleToggle(); updateTimer(); }

bindEvents();
renderAll();
void initCalculator();

timer = window.setInterval(() => {
  if (state.secondsRemaining > 0) { state.secondsRemaining -= 1; updateTimer(); if (state.secondsRemaining % 10 === 0) persist(); }
  else if (timer) window.clearInterval(timer);
}, 1000);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined));
}
