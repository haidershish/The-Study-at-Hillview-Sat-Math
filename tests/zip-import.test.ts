import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { importBankZip } from '../src/questions/zip-import';

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function question(id: string, src: string) {
  return {
    id, domain: 'Algebra', skill: 's', difficulty: 1, prompt: 'p',
    type: 'multiple-choice', choices: [{ id: 'a', text: 'a' }, { id: 'b', text: 'b' }],
    answer: 'a', explanation: 'e',
    assets: [{ id: `${id}-fig`, type: 'diagram', src, alt: 'figure' }],
  };
}

async function makeZipFile(files: Record<string, string | Uint8Array>): Promise<File> {
  const zip = new JSZip();
  for (const [path, content] of Object.entries(files)) zip.file(path, content);
  const bytes = await zip.generateAsync({ type: 'uint8array' });
  return new File([bytes as unknown as BlobPart], 'bank.zip', { type: 'application/zip' });
}

describe('ZIP bank import', () => {
  it('imports a bank and inlines referenced images as data URLs', async () => {
    const file = await makeZipFile({
      'bank.json': JSON.stringify({ id: 'bank-z', title: 'Z Bank', description: 'desc' }),
      'questions.json': JSON.stringify([question('Z-1', 'assets/fig.png')]),
      'assets/fig.png': PNG_BYTES,
    });
    const { bank } = await importBankZip(file);
    expect(bank.id).toBe('bank-z');
    expect(bank.title).toBe('Z Bank');
    expect(bank.questions).toHaveLength(1);
    expect(bank.questions[0].assets![0].src).toMatch(/^data:image\/png;base64,/);
  });

  it('resolves legacy assetIds into assets entries', async () => {
    const q = question('Z-2', 'assets/fig.png');
    delete (q as { assets?: unknown }).assets;
    (q as { assetIds?: string[] }).assetIds = ['fig.png'];
    const file = await makeZipFile({
      'questions.json': JSON.stringify([q]),
      'assets/fig.png': PNG_BYTES,
    });
    const { bank } = await importBankZip(file);
    expect(bank.questions[0].assets).toHaveLength(1);
    expect(bank.questions[0].assets![0].src).toMatch(/^data:image\/png;base64,/);
  });

  it('fails when a referenced image is missing from the ZIP', async () => {
    const file = await makeZipFile({
      'questions.json': JSON.stringify([question('Z-3', 'assets/missing.png')]),
    });
    await expect(importBankZip(file)).rejects.toThrow(/missing/i);
  });
});
