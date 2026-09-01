import type { QuestionAsset } from '../types';

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string));

const escapeAttr = (value: string): string =>
  value.replace(/[&"']/g, ch => ({ '&': '&amp;', '"': '&quot;', "'": '&#39;' }[ch] as string));

/** Render a question's image assets as responsive figures. */
export function renderAssetsHTML(assets: QuestionAsset[] | undefined): string {
  if (!assets || assets.length === 0) return '';
  const figures = assets.map((asset, index) => `
    <figure class="question-asset ${asset.placement ? `placement-${asset.placement}` : 'placement-after-prompt'}" data-asset-index="${index}">
      <div class="question-asset-frame">
        <img src="${escapeAttr(asset.src)}" alt="${escapeAttr(asset.alt)}"${asset.width ? ` width="${asset.width}"` : ''}${asset.height ? ` height="${asset.height}"` : ''} loading="lazy" decoding="async">
        <div class="question-asset-missing" hidden>Image unavailable</div>
      </div>
      <figcaption>${escapeHtml(asset.alt)}</figcaption>
    </figure>`).join('');
  return `<div class="question-assets">${figures}</div>`;
}

/** Attach error handling + click-to-enlarge to rendered asset figures. */
export function wireAssets(container: HTMLElement): void {
  container.querySelectorAll<HTMLElement>('.question-asset').forEach(figure => {
    const img = figure.querySelector<HTMLImageElement>('img');
    const missing = figure.querySelector<HTMLElement>('.question-asset-missing');
    if (img && missing) {
      img.addEventListener('error', () => {
        figure.classList.add('missing');
        missing.hidden = false;
      });
      img.addEventListener('load', () => {
        figure.classList.add('loaded');
        missing.hidden = true;
      });
      if (img.complete && img.naturalWidth > 0) figure.classList.add('loaded');
    }
    figure.addEventListener('click', () => openLightbox(img?.src ?? '', img?.alt ?? ''));
    figure.setAttribute('tabindex', '0');
    figure.setAttribute('role', 'button');
    figure.setAttribute('aria-label', img ? `Enlarge image: ${img.alt}` : 'Enlarge image');
    figure.addEventListener('keydown', event => {
      if ((event as KeyboardEvent).key === 'Enter' || (event as KeyboardEvent).key === ' ') {
        event.preventDefault();
        openLightbox(img?.src ?? '', img?.alt ?? '');
      }
    });
  });
}

/** Preload a set of image URLs so they are ready before they are shown. */
export function preloadImages(assets: QuestionAsset[] | undefined): void {
  for (const asset of assets ?? []) {
    const img = new Image();
    img.src = asset.src;
    img.alt = asset.alt;
  }
}

function openLightbox(src: string, alt: string): void {
  if (!src) return;
  const overlay = document.createElement('div');
  overlay.className = 'asset-lightbox';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', alt || 'Enlarged image');
  overlay.innerHTML = `<figure><img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}"><figcaption>${escapeHtml(alt)}</figcaption><button class="asset-lightbox-close" aria-label="Close">×</button></figure>`;
  const close = () => overlay.remove();
  overlay.addEventListener('click', event => {
    if (event.target === overlay || (event.target as HTMLElement).classList.contains('asset-lightbox-close')) close();
  });
  overlay.addEventListener('keydown', event => {
    if ((event as KeyboardEvent).key === 'Escape') close();
  });
  document.body.appendChild(overlay);
  overlay.querySelector<HTMLButtonElement>('.asset-lightbox-close')?.focus();
}
