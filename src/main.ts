import DOMPurify from 'dompurify';
import './styles.css';
import type { Question, SessionState } from './types';
import { sampleQuestions } from './questions/sample';
import { importQuestionFile } from './questions/importer';
import { createGraph } from './calculator/graph';
import { evaluateExpression, formatNumber, isValidExpression, tableValues } from './calculator/engine';
import { exportState, initialState, loadState, nextColor, saveState } from './state/store';

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
    <aside class="calculator-panel" id="calculator-panel" aria-label="Open-source calculator">
      <div class="calculator-header">
        <div><strong>Calculator</strong><small>Open-source classroom edition</small></div>
        <button class="quiet" id="reset-graph">Reset view</button>
      </div>
      <div class="calculator-tabs" role="tablist">
        <button class="calc-tab active" data-tab="graph">Graph</button>
        <button class="calc-tab" data-tab="table">Table</button>
        <button class="calc-tab" data-tab="scientific">Scientific</button>
      </div>
      <section class="calc-view graph-view active" data-view="graph">
        <div class="expressions-panel">
          <div class="expressions-title"><strong>Expressions</strong><button id="add-expression" aria-label="Add expression">＋</button></div>
          <div id="expression-list"></div>
          <p class="mini-help">Examples: <code>y=x^2-4</code>, <code>y=sin(x)</code><br>Scroll to zoom · drag to pan</p>
        </div>
        <div class="graph-stage" id="graph" role="img" aria-label="Interactive coordinate graph"></div>
      </section>
      <section class="calc-view table-view" data-view="table">
        <div class="table-controls"><label>Expression <select id="table-expression"></select></label><label>Start <input id="table-start" type="number" value="-3"></label><label>Step <input id="table-step" type="number" value="1" min="0.01" step="0.1"></label><button class="primary" id="make-table">Generate</button></div>
        <div class="table-scroll"><table><thead><tr><th>x</th><th>y</th></tr></thead><tbody id="table-body"></tbody></table></div>
      </section>
      <section class="calc-view scientific-view" data-view="scientific">
        <label class="math-label" for="scientific-input">Expression</label>
        <input class="formula-input" id="scientific-input" value="sqrt(144)+5!" autocomplete="off" spellcheck="false">
        <div class="science-actions"><button class="primary" id="evaluate">Evaluate</button><button class="quiet" id="clear-science">Clear</button></div>
        <output class="result" id="science-result" aria-live="polite">Result appears here</output>
        <div class="quick-keys" id="quick-keys">
          <button data-insert="sqrt">√</button><button data-insert="pi">π</button><button data-insert="^2">x²</button>
          <button data-value="nCr(5,2)">nCr</button><button data-value="nPr(5,2)">nPr</button><button data-insert="!">n!</button>
          <button data-value="sin(pi/6)">sin</button><button data-value="log(100,10)">log</button><button data-value="sum([1,2,3,4])">Σ</button>
        </div>
        <p class="science-help"><strong>SAT shortcuts:</strong> nCr(5,2), nPr(5,2), 7+(20-1)*4, sum([1,2,3,4])</p>
      </section>
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
const graph = createGraph($('graph'));
let timer: number | undefined;

const clean = (value: string): string => DOMPurify.sanitize(value, { ALLOWED_TAGS: [] });
const persist = () => saveState(state);
const toast = (message: string, error = false) => {
  const node = $('toast');
  node.textContent = message;
  node.className = `toast show${error ? ' error' : ''}`;
  window.setTimeout(() => node.className = 'toast', 2600);
};

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
  tip.hidden = !q.calculatorTip;
  tip.innerHTML = q.calculatorTip ? `<strong>Calculator strategy</strong><br>${clean(q.calculatorTip)}` : '';

  document.querySelectorAll<HTMLInputElement>('input[name="answer"]').forEach(input => input.addEventListener('change', () => {
    state.responses[q.id] = input.value; persist(); renderQuestion(); renderMenu();
  }));
  document.getElementById('spr')?.addEventListener('input', event => {
    state.responses[q.id] = (event.target as HTMLInputElement).value; persist(); renderMenu();
  });
  renderMenu();
}

function renderMenu(): void {
  $('question-menu').innerHTML = questions.map((q, index) => `<button data-index="${index}" class="${index === state.current ? 'current' : ''}"><span>${index + 1}</span><span>${clean(q.skill)}</span><b>${state.responses[q.id] ? '✓' : ''}${state.review.includes(q.id) ? ' ★' : ''}</b></button>`).join('');
}

function renderExpressions(): void {
  $('expression-list').innerHTML = state.expressions.map((expression, index) => `
    <div class="expression-row ${isValidExpression(expression.source) ? '' : 'invalid'}">
      <button class="visibility" data-visible="${expression.id}" style="--expression-color:${expression.color}" aria-label="Toggle expression ${index + 1}">${expression.visible ? '●' : '○'}</button>
      <span class="expression-number">${index + 1}</span>
      <input value="${clean(expression.source)}" data-expression="${expression.id}" aria-label="Expression ${index + 1}" spellcheck="false">
      <button class="remove-expression" data-remove="${expression.id}" aria-label="Remove expression">×</button>
    </div>`).join('');
  graph.setExpressions(state.expressions);
  const options = state.expressions.map((expression, index) => `<option value="${expression.id}">${index + 1}: ${clean(expression.source || 'blank')}</option>`).join('');
  $('table-expression').innerHTML = options;
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

function selectTab(name: string): void {
  document.querySelectorAll('.calc-tab').forEach(node => node.classList.toggle('active', (node as HTMLElement).dataset.tab === name));
  document.querySelectorAll('.calc-view').forEach(node => node.classList.toggle('active', (node as HTMLElement).dataset.view === name));
  if (name === 'graph') graph.setExpressions(state.expressions);
}

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
  });
  $('dialog-close').addEventListener('click', () => ($('dialog') as HTMLDialogElement).close());
  $('dialog').addEventListener('click', event => { if (event.target === $('dialog')) ($('dialog') as HTMLDialogElement).close(); });
  $('dialog-body').addEventListener('click', event => {
    const tool = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-tool]')?.dataset.tool;
    if (tool === 'import') $('question-file').click();
    if (tool === 'export') { exportState(state); toast('Session exported.'); }
    if (tool === 'score') showScore();
    if (tool === 'reset' && window.confirm('Clear this session and restore the sample questions?')) { state = initialState(); questions = sampleQuestions; persist(); ($('dialog') as HTMLDialogElement).close(); renderAll(); }
  });
  $('question-file').addEventListener('change', async event => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try { questions = await importQuestionFile(file); state = initialState(); persist(); renderAll(); ($('dialog') as HTMLDialogElement).close(); toast(`${questions.length} questions imported.`); }
    catch (error) { toast(error instanceof Error ? error.message : 'Import failed.', true); }
  });
  document.querySelectorAll('.calc-tab').forEach(button => button.addEventListener('click', () => selectTab((button as HTMLElement).dataset.tab || 'graph')));
  $('add-expression').addEventListener('click', () => {
    state.expressions.push({ id: crypto.randomUUID(), source: '', color: nextColor(state.expressions.length), visible: true });
    persist(); renderExpressions();
    document.querySelector<HTMLInputElement>('[data-expression]:last-of-type')?.focus();
  });
  $('expression-list').addEventListener('input', event => {
    const input = (event.target as HTMLElement).closest<HTMLInputElement>('[data-expression]');
    if (!input) return;
    const expression = state.expressions.find(item => item.id === input.dataset.expression);
    if (expression) expression.source = input.value;
    persist(); renderExpressions();
    document.querySelector<HTMLInputElement>(`[data-expression="${input.dataset.expression}"]`)?.focus();
  });
  $('expression-list').addEventListener('click', event => {
    const target = event.target as HTMLElement;
    const remove = target.closest<HTMLButtonElement>('[data-remove]')?.dataset.remove;
    const visible = target.closest<HTMLButtonElement>('[data-visible]')?.dataset.visible;
    if (remove) state.expressions = state.expressions.filter(item => item.id !== remove);
    if (visible) { const expression = state.expressions.find(item => item.id === visible); if (expression) expression.visible = !expression.visible; }
    if (remove || visible) { persist(); renderExpressions(); }
  });
  $('reset-graph').addEventListener('click', () => graph.reset());
  $('make-table').addEventListener('click', () => {
    const id = ($('table-expression') as HTMLSelectElement).value;
    const expression = state.expressions.find(item => item.id === id);
    const start = Number(($('table-start') as HTMLInputElement).value);
    const step = Math.abs(Number(($('table-step') as HTMLInputElement).value)) || 1;
    const rows = expression ? tableValues(expression.source, start, start + step * 9, step) : [];
    $('table-body').innerHTML = rows.map(row => `<tr><td>${formatNumber(row.x)}</td><td>${row.y === null ? 'undefined' : formatNumber(row.y)}</td></tr>`).join('') || '<tr><td colspan="2">Choose a valid function.</td></tr>';
  });
  $('evaluate').addEventListener('click', evaluateScientific);
  $('scientific-input').addEventListener('keydown', event => { if ((event as KeyboardEvent).key === 'Enter') evaluateScientific(); });
  $('clear-science').addEventListener('click', () => { ($('scientific-input') as HTMLInputElement).value = ''; $('science-result').textContent = 'Result appears here'; });
  $('quick-keys').addEventListener('click', event => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!button) return;
    const field = $('scientific-input') as HTMLInputElement;
    if (button.dataset.value) field.value = button.dataset.value;
    else if (button.dataset.insert) field.value += button.dataset.insert;
    field.focus();
  });
}

function evaluateScientific(): void {
  const field = $('scientific-input') as HTMLInputElement;
  try { $('science-result').textContent = `= ${formatNumber(evaluateExpression(field.value))}`; }
  catch { $('science-result').textContent = 'Check the expression and try again.'; }
}

function updateTimer(): void {
  const minutes = Math.floor(state.secondsRemaining / 60);
  const seconds = String(state.secondsRemaining % 60).padStart(2, '0');
  $('timer').textContent = state.timerHidden ? 'Show timer' : `${minutes}:${seconds}`;
}

function renderAll(): void { renderQuestion(); renderExpressions(); updateTimer(); }

bindEvents();
renderAll();
timer = window.setInterval(() => {
  if (state.secondsRemaining > 0) { state.secondsRemaining -= 1; updateTimer(); if (state.secondsRemaining % 10 === 0) persist(); }
  else if (timer) window.clearInterval(timer);
}, 1000);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined));
}
