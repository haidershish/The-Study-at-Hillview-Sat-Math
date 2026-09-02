import { describe, expect, it } from 'vitest';
import { resolveAssets, resolveAssetSrc } from '../src/questions/images';

describe('question image paths', () => {
  it('resolves a relative source against its bank asset base', () => {
    expect(resolveAssetSrc('assets/table-01.png', './banks/module-2')).toBe('./banks/module-2/assets/table-01.png');
  });

  it('leaves self-contained sources unchanged', () => {
    expect(resolveAssetSrc('data:image/png;base64,abc', './banks/module-2')).toBe('data:image/png;base64,abc');
    expect(resolveAssetSrc('https://example.test/graph.svg', './banks/module-2')).toBe('https://example.test/graph.svg');
    expect(resolveAssetSrc('/shared/diagram.png', './banks/module-2')).toBe('/shared/diagram.png');
  });

  it('returns copies and does not mutate bank data', () => {
    const source = [{ id: 'fig', type: 'diagram', src: 'fig.svg', alt: 'A triangle' }];
    const resolved = resolveAssets(source, './module-2');
    expect(resolved?.[0].src).toBe('./module-2/fig.svg');
    expect(source[0].src).toBe('fig.svg');
  });
});
