import functionPlot, { type Chart } from 'function-plot';
import type { Expression } from '../types';
import { functionBody } from './engine';

export interface DataPoint { x: number; y: number }

export interface GraphAdapter {
  setExpressions(expressions: Expression[]): void;
  setPoints(points: DataPoint[], connect: boolean): void;
  reset(): void;
  destroy(): void;
}

export function createGraph(target: HTMLElement): GraphAdapter {
  let expressions: Expression[] = [];
  let points: DataPoint[] = [];
  let connectPoints = false;
  let chart: Chart | null = null;
  let xDomain: [number, number] = [-10, 10];
  let yDomain: [number, number] = [-10, 10];
  let frame = 0;

  const formatCoordinate = (value: number): string => {
    if (Object.is(value, -0)) return '0';
    return value.toFixed(6).replace(/\.?0+$/, '');
  };

  const showCoordinate = (event: MouseEvent): void => {
    if (!chart?.meta.xScale || !chart.meta.yScale) return;
    const plotNode = chart.draggable?.node?.() as SVGRectElement | undefined;
    const plotRect = plotNode?.getBoundingClientRect() ?? target.getBoundingClientRect();
    const px = event.clientX - plotRect.left;
    const py = event.clientY - plotRect.top;
    if (px < 0 || py < 0 || px > plotRect.width || py > plotRect.height) return;

    const x = chart.meta.xScale.invert(px);
    const y = chart.meta.yScale.invert(py);
    const bubble = target.querySelector<HTMLOutputElement>('.graph-coordinate-bubble');
    if (!bubble) return;
    const xText = formatCoordinate(x);
    const yText = formatCoordinate(y);
    bubble.textContent = `(${xText}, ${yText})`;
    bubble.setAttribute('aria-label', `Coordinates ${xText}, ${yText}`);
    bubble.hidden = false;
    const targetRect = target.getBoundingClientRect();
    const left = event.clientX - targetRect.left + 10;
    const top = event.clientY - targetRect.top + 10;
    bubble.style.left = `${Math.max(4, Math.min(left, targetRect.width - bubble.offsetWidth - 4))}px`;
    bubble.style.top = `${Math.max(4, Math.min(top, targetRect.height - bubble.offsetHeight - 4))}px`;
  };

  target.addEventListener('click', showCoordinate, true);

  const draw = () => {
    frame = 0;
    chart = null;
    target.replaceChildren();
    const rect = target.getBoundingClientRect();
    if (rect.width < 40 || rect.height < 40) return;

    const data: Array<Record<string, unknown>> = expressions.flatMap(expression => {
      const fn = functionBody(expression.source);
      return expression.visible && fn ? [{ fn, color: expression.color, graphType: 'polyline' as const }] : [];
    });

    if (points.length > 0) {
      data.push({
        points: points.map(p => [p.x, p.y]),
        fnType: 'points',
        graphType: connectPoints ? 'polyline' : 'scatter',
        color: '#2d70b3',
        attr: { r: 4 },
      });
    }

    try {
      chart = functionPlot({
        target,
        width: Math.floor(rect.width),
        height: Math.floor(rect.height),
        grid: true,
        disableZoom: false,
        xAxis: { domain: xDomain, label: 'x' },
        yAxis: { domain: yDomain, label: 'y' },
        data,
      });
      const bubble = document.createElement('output');
      bubble.className = 'graph-coordinate-bubble';
      bubble.hidden = true;
      bubble.setAttribute('role', 'status');
      bubble.setAttribute('aria-live', 'polite');
      target.append(bubble);
      target.removeAttribute('data-error');
    } catch {
      chart = null;
      target.dataset.error = 'One or more expressions could not be graphed.';
    }
  };

  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(draw);
  };
  const observer = new ResizeObserver(schedule);
  observer.observe(target);

  return {
    setExpressions(value) { expressions = value; schedule(); },
    setPoints(value, connect) { points = value; connectPoints = connect; schedule(); },
    reset() { xDomain = [-10, 10]; yDomain = [-10, 10]; schedule(); },
    destroy() { observer.disconnect(); cancelAnimationFrame(frame); target.removeEventListener('click', showCoordinate, true); chart = null; },
  };
}
