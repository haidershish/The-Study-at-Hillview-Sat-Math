import functionPlot from 'function-plot';
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
  let xDomain: [number, number] = [-10, 10];
  let yDomain: [number, number] = [-10, 10];
  let frame = 0;

  const draw = () => {
    frame = 0;
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
      functionPlot({
        target,
        width: Math.floor(rect.width),
        height: Math.floor(rect.height),
        grid: true,
        disableZoom: false,
        xAxis: { domain: xDomain, label: 'x' },
        yAxis: { domain: yDomain, label: 'y' },
        data,
      });
      target.removeAttribute('data-error');
    } catch {
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
    destroy() { observer.disconnect(); cancelAnimationFrame(frame); },
  };
}
