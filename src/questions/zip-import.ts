import JSZip from 'jszip';
import { validateQuestionBank } from './importer';
import type { Bank, QuestionAsset } from '../types';

const IMAGE_RE = /\.(png|jpe?g|webp|gif|svg)$/i;

function mimeFor(name: string): string {
  if (/\.png$/i.test(name)) return 'image/png';
  if (/\.jpe?g$/i.test(name)) return 'image/jpeg';
  if (/\.webp$/i.test(name)) return 'image/webp';
  if (/\.gif$/i.test(name)) return 'image/gif';
  if (/\.svg$/i.test(name)) return 'image/svg+xml';
  return 'application/octet-stream';
}

function sanitizeId(name: string): string {
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return id || 'imported-bank';
}

function basename(path: string): string {
  return path.split('/').pop() ?? path;
}

/** Find an image entry by a relative reference (exact, under assets/, or by basename). */
function resolveImage(imageEntries: Map<string, JSZip.JSZipObject>, ref: string): JSZip.JSZipObject | undefined {
  const clean = ref.replace(/^\.?\//, '');
  if (imageEntries.has(clean)) return imageEntries.get(clean);
  if (imageEntries.has(`assets/${clean}`)) return imageEntries.get(`assets/${clean}`);
  const target = basename(clean);
  for (const [name, entry] of imageEntries) {
    if (basename(name) === target) return entry;
  }
  return undefined;
}

async function entryToDataUrl(entry: JSZip.JSZipObject): Promise<string> {
  const base64 = await entry.async('base64');
  return `data:${mimeFor(entry.name)};base64,${base64}`;
}

function findEntry(zip: JSZip, pattern: RegExp): JSZip.JSZipObject | undefined {
  let found: JSZip.JSZipObject | undefined;
  zip.forEach((path, entry) => {
    if (!found && !entry.dir && pattern.test(path)) found = entry;
  });
  return found;
}

export interface ImportedBankResult {
  bank: Omit<Bank, 'builtin'>;
  warnings: string[];
}

/**
 * Import a complete bank package from a ZIP archive:
 *
 *   bank.zip
 *     bank.json        (optional metadata: id, title, description)
 *     questions.json   (question array)
 *     assets/…         (images referenced by questions)
 *
 * Every image referenced by the questions must exist in the archive, or the
 * import fails with a specific message. Images are inlined as local data URLs
 * (self-contained, no external upload, refresh-safe).
 */
export async function importBankZip(file: File): Promise<ImportedBankResult> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const warnings: string[] = [];

  const questionsEntry = zip.file('questions.json') ?? findEntry(zip, /questions\.json$/i);
  if (!questionsEntry) throw new Error('The ZIP must contain a questions.json file.');
  const questions = validateQuestionBank(JSON.parse(await questionsEntry.async('string')) as unknown);

  const bankEntry = zip.file('bank.json') ?? findEntry(zip, /bank\.json$/i);
  let id = '';
  let title = '';
  let description = '';
  if (bankEntry) {
    const meta = JSON.parse(await bankEntry.async('string')) as { id?: string; title?: string; description?: string };
    id = meta.id ?? '';
    title = meta.title ?? '';
    description = meta.description ?? '';
  }
  id = sanitizeId(id || file.name.replace(/\.zip$/i, ''));
  if (!title) title = id;

  const imageEntries = new Map<string, JSZip.JSZipObject>();
  zip.forEach((path, entry) => {
    if (!entry.dir && IMAGE_RE.test(path)) imageEntries.set(path, entry);
  });

  const missing: string[] = [];
  const dataUrlCache = new Map<string, string>();

  for (const question of questions) {
    const assets: QuestionAsset[] = question.assets ? [...question.assets] : [];

    // Resolve explicit assets[].src
    for (const asset of assets) {
      const entry = resolveImage(imageEntries, asset.src);
      if (!entry) { missing.push(`${question.id}: ${asset.src}`); continue; }
      const dataUrl = dataUrlCache.get(entry.name) ?? await entryToDataUrl(entry);
      dataUrlCache.set(entry.name, dataUrl);
      asset.src = dataUrl;
    }

    // Convert legacy assetIds[] into assets entries
    if (question.assetIds?.length) {
      const existing = new Set(assets.map(a => a.id));
      for (const assetId of question.assetIds) {
        if (existing.has(assetId)) continue;
        const entry = resolveImage(imageEntries, assetId);
        if (!entry) { missing.push(`${question.id}: ${assetId}`); continue; }
        const dataUrl = dataUrlCache.get(entry.name) ?? await entryToDataUrl(entry);
        dataUrlCache.set(entry.name, dataUrl);
        assets.push({
          id: assetId,
          type: 'diagram',
          src: dataUrl,
          alt: `Figure for this question (${assetId})`,
          sourcePage: question.sourcePage,
        });
      }
    }

    if (assets.length) question.assets = assets;
  }

  if (missing.length) {
    throw new Error(`Some referenced images are missing from the ZIP: ${missing.slice(0, 10).join(', ')}${missing.length > 10 ? ` (+${missing.length - 10} more)` : ''}`);
  }

  return { bank: { id, title, description, questions, assetBase: '' }, warnings };
}

export { validateQuestionBank };
