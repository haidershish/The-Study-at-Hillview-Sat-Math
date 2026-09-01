import type { AngleMode, CalculatorExpression, CalculatorProvider } from './types';
import { createGraph, type GraphAdapter } from './graph';
import { evaluateExpression, formatNumber, isValidExpression, tableValues, unsupportedRelation } from './engine';

const COLORS = ['#c74440', '#2d70b3', '#388c46', '#6042a6', '#000000'];

const UNSUPPORTED_MESSAGES: Record<string, string> = {
  'regression': 'Regressions need the official Desmos calculator.',
  'restriction-or-piecewise': 'Piecewise functions and domain restrictions need the official Desmos calculator.',
  'inequality': 'Inequalities and shaded regions need the official Desmos calculator.',
  'implicit-equation': 'Implicit equations (such as circles) need the official Desmos calculator.',
};

interface OpenSourceState {
  expressions: CalculatorExpression[];
  angleMode: AngleMode;
}

export interface OpenSourceProviderOptions {
  onChange?: (expressions: CalculatorExpression[], angleMode: AngleMode) => void;
}

/**
 * Offline open-source calculator: math.js for evaluation, function-plot for
 * graphing. This is the fallback used whenever the official Desmos provider is
 * unavailable (no key, offline, or rejected key).
 */
export class OpenSourceCalculatorProvider implements CalculatorProvider {
  readonly id = 'open-source' as const;
  ready = false;

  private expressions: CalculatorExpression[] = [];
  private angleMode: AngleMode = 'radians';
  private container: HTMLElement | null = null;
  private graph: GraphAdapter | null = null;
  private onChange?: (expressions: CalculatorExpression[], angleMode: AngleMode) => void;

  constructor(options: OpenSourceProviderOptions = {}) {
    this.onChange = options.onChange;
  }

  async mount(container: HTMLElement): Promise<void> {
    if (this.container) return;
    this.container = container;
    container.innerHTML = this.renderShell();
    this.graph = createGraph(this.require<HTMLElement>('.graph-stage'));
    this.bindEvents();
    this.renderExpressions();
    this.ready = true;
  }

  destroy(): void {
    this.graph?.destroy();
    this.graph = null;
    this.container?.replaceChildren();
    this.container = null;
    this.ready = false;
  }

  setExpressions(expressions: CalculatorExpression[]): void {
    this.expressions = expressions.map(e => ({ ...e }));
    if (this.container) this.renderExpressions();
    else this.draw();
  }

  addExpression(expression: CalculatorExpression): void {
    const item: CalculatorExpression = {
      id: expression.id || crypto.randomUUID(),
      latex: expression.latex,
      source: expression.source ?? expression.latex,
      color: expression.color ?? COLORS[this.expressions.length % COLORS.length],
      visible: expression.visible !== false,
    };
    this.expressions.push(item);
    this.emitAndRender();
  }

  removeExpression(id: string): void {
    this.expressions = this.expressions.filter(e => e.id !== id);
    this.emitAndRender();
  }

  clear(): void {
    this.expressions = [];
    this.emitAndRender();
  }

  getState(): OpenSourceState {
    return { expressions: this.expressions.map(e => ({ ...e })), angleMode: this.angleMode };
  }

  setState(state: unknown): void {
    const s = state as Partial<OpenSourceState> | null | undefined;
    if (!s) return;
    if (Array.isArray(s.expressions)) this.expressions = s.expressions.map(e => ({ ...e }));
    if (s.angleMode === 'degrees' || s.angleMode === 'radians') this.angleMode = s.angleMode;
    if (this.container) this.renderExpressions();
  }

  resize(): void {
    // function-plot observes the stage via ResizeObserver; nothing else needed.
  }

  resetViewport(): void {
    this.graph?.reset();
  }

  setAngleMode(mode: AngleMode): void {
    if (this.angleMode === mode) return;
    this.angleMode = mode;
    this.emitAndRender();
  }

  // ---- internals -----------------------------------------------------------

  private emitAndRender(): void {
    this.draw();
    this.onChange?.(this.expressions.map(e => ({ ...e })), this.angleMode);
    if (this.container) this.renderExpressions();
  }

  private draw(): void {
    this.graph?.setExpressions(this.expressions.map(e => ({
      id: e.id, source: e.source ?? '', color: e.color ?? COLORS[0], visible: e.visible !== false,
    })));
  }

  private require<T extends HTMLElement>(selector: string): T {
    const el = this.container?.querySelector<T>(selector);
    if (!el) throw new Error(`Missing element in open-source calculator: ${selector}`);
    return el;
  }

  private renderShell(): string {
    return `
      <div class="calculator-tabs" role="tablist" aria-label="Calculator views">
        <button class="calc-tab active" data-tab="graph" role="tab" aria-selected="true">Graph</button>
        <button class="calc-tab" data-tab="table" role="tab" aria-selected="false">Table</button>
        <button class="calc-tab" data-tab="scientific" role="tab" aria-selected="false">Scientific</button>
      </div>
      <section class="calc-view graph-view active" data-view="graph">
        <div class="expressions-panel">
          <div class="expressions-title"><strong>Expressions</strong><button id="add-expression" aria-label="Add expression">＋</button></div>
          <div class="expression-list"></div>
          <p class="mini-help">Examples: <code>y=x^2-4</code>, <code>y=sin(x)</code><br>Scroll to zoom · drag to pan</p>
        </div>
        <div class="graph-stage" role="img" aria-label="Interactive coordinate graph"></div>
      </section>
      <section class="calc-view table-view" data-view="table">
        <div class="table-controls">
          <label>Expression <select class="table-expression"></select></label>
          <label>Start <input class="table-start" type="number" value="-3"></label>
          <label>Step <input class="table-step" type="number" value="1" min="0.01" step="0.1"></label>
          <button class="primary" id="make-table">Generate</button>
        </div>
        <div class="table-scroll"><table><thead><tr><th>x</th><th>y</th></tr></thead><tbody class="table-body"></tbody></table></div>
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
      </section>`;
  }

  private bindEvents(): void {
    this.container?.querySelectorAll('.calc-tab').forEach(button => {
      button.addEventListener('click', () => this.selectTab((button as HTMLElement).dataset.tab || 'graph'));
    });

    this.require<HTMLElement>('#add-expression').addEventListener('click', () => {
      this.addExpression({ id: crypto.randomUUID(), latex: '', source: '' });
      this.container?.querySelector<HTMLInputElement>('[data-expression]:last-of-type')?.focus();
    });

    const list = this.require<HTMLElement>('.expression-list');
    list.addEventListener('input', event => {
      const input = (event.target as HTMLElement).closest<HTMLInputElement>('[data-expression]');
      if (!input) return;
      const expression = this.expressions.find(item => item.id === input.dataset.expression);
      if (expression) { expression.source = input.value; expression.latex = input.value; }
      this.draw();
      this.onChange?.(this.expressions.map(e => ({ ...e })), this.angleMode);
      this.renderExpressions();
      this.container?.querySelector<HTMLInputElement>(`[data-expression="${input.dataset.expression}"]`)?.focus();
    });

    list.addEventListener('click', event => {
      const target = event.target as HTMLElement;
      const removeId = target.closest<HTMLButtonElement>('[data-remove]')?.dataset.remove;
      const visibleId = target.closest<HTMLButtonElement>('[data-visible]')?.dataset.visible;
      if (removeId) this.removeExpression(removeId);
      else if (visibleId) {
        const expression = this.expressions.find(item => item.id === visibleId);
        if (expression) { expression.visible = expression.visible === false; this.emitAndRender(); }
      }
    });

    this.require<HTMLElement>('#make-table').addEventListener('click', () => this.generateTable());
    this.require<HTMLElement>('#evaluate').addEventListener('click', () => this.evaluateScientific());
    this.require<HTMLElement>('#scientific-input').addEventListener('keydown', event => {
      if ((event as KeyboardEvent).key === 'Enter') this.evaluateScientific();
    });
    this.require<HTMLElement>('#clear-science').addEventListener('click', () => {
      (this.require<HTMLInputElement>('#scientific-input')).value = '';
      (this.require<HTMLElement>('#science-result')).textContent = 'Result appears here';
    });
    this.require<HTMLElement>('#quick-keys').addEventListener('click', event => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
      if (!button) return;
      const field = this.require<HTMLInputElement>('#scientific-input');
      if (button.dataset.value) field.value = button.dataset.value;
      else if (button.dataset.insert) field.value += button.dataset.insert;
      field.focus();
    });
  }

  private selectTab(name: string): void {
    this.container?.querySelectorAll('.calc-tab').forEach(node => {
      const tab = node as HTMLButtonElement;
      const active = tab.dataset.tab === name;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    this.container?.querySelectorAll('.calc-view').forEach(node => {
      (node as HTMLElement).classList.toggle('active', (node as HTMLElement).dataset.view === name);
    });
    if (name === 'graph') this.draw();
  }

  private renderExpressions(): void {
    if (!this.container) return;
    const list = this.require<HTMLElement>('.expression-list');
    list.innerHTML = this.expressions.map((expression, index) => {
      const source = expression.source ?? '';
      const unsupported = unsupportedRelation(source);
      return `
        <div class="expression-row ${isValidExpression(source, this.angleMode) ? '' : 'invalid'}">
          <button class="visibility" data-visible="${expression.id}" style="--expression-color:${expression.color ?? COLORS[0]}" aria-label="Toggle expression ${index + 1}">${expression.visible === false ? '○' : '●'}</button>
          <span class="expression-number">${index + 1}</span>
          <input value="${escapeHtml(source)}" data-expression="${expression.id}" aria-label="Expression ${index + 1}" spellcheck="false">
          <button class="remove-expression" data-remove="${expression.id}" aria-label="Remove expression">×</button>
          ${unsupported ? `<div class="expression-note">${UNSUPPORTED_MESSAGES[unsupported]}</div>` : ''}
        </div>`;
    }).join('');

    const select = this.require<HTMLSelectElement>('.table-expression');
    select.innerHTML = this.expressions.map((expression, index) =>
      `<option value="${expression.id}">${index + 1}: ${escapeHtml(expression.source || 'blank')}</option>`).join('');
    this.draw();
  }

  private generateTable(): void {
    const id = this.require<HTMLSelectElement>('.table-expression').value;
    const expression = this.expressions.find(item => item.id === id);
    const start = Number(this.require<HTMLInputElement>('.table-start').value);
    const step = Math.abs(Number(this.require<HTMLInputElement>('.table-step').value)) || 1;
    const body = this.require<HTMLElement>('.table-body');
    if (!expression) { body.innerHTML = '<tr><td colspan="2">Choose a valid function.</td></tr>'; return; }
    const source = expression.source ?? '';
    const unsupported = unsupportedRelation(source);
    if (unsupported) {
      body.innerHTML = `<tr><td colspan="2">${UNSUPPORTED_MESSAGES[unsupported]}</td></tr>`;
      return;
    }
    const rows = tableValues(source, start, start + step * 9, step, this.angleMode);
    body.innerHTML = rows.map(row => `<tr><td>${formatNumber(row.x)}</td><td>${row.y === null ? 'undefined' : formatNumber(row.y)}</td></tr>`).join('')
      || '<tr><td colspan="2">Choose a valid function.</td></tr>';
  }

  private evaluateScientific(): void {
    const field = this.require<HTMLInputElement>('#scientific-input');
    const result = this.require<HTMLElement>('#science-result');
    try { result.textContent = `= ${formatNumber(evaluateExpression(field.value, {}, this.angleMode))}`; }
    catch { result.textContent = 'Check the expression and try again.'; }
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string));
}
