# SAT Math Lab

A Digital SAT Math practice platform with an embedded graphing calculator.
Configure a [Desmos API](https://www.desmos.com/api/) key to use the **official
Desmos calculator** in a SAT-compatible configuration; otherwise it falls back to
an **open-source offline calculator** (math.js + function-plot). Ships with
multiple question banks, a build-your-own-test homepage, image support, ZIP bank
import, and a local PDF → question-bank authoring tool.

> This is an independent classroom tool. It is **not** affiliated with or
> endorsed by College Board or Desmos, and it does not replicate Bluebook trade
> dress or proprietary interface details.

## Features

- **Homepage** — pick a single bank, combined mode, or random practice; filter by
  domain and difficulty; choose 5/10/15/20/25/full/custom question counts; resume
  an active session.
- **Multiple banks** — a central manifest makes adding a bank a two-step task
  (drop in the JSON + add one entry). Each bank shows title, description, count,
  domains, and difficulties.
- **Combined & random tests** — Fisher–Yates shuffle, duplicate prevention,
  reproducible seed, optional domain-balanced selection, persistent question order.
- **Questions with images** — multiple figures per question, responsive rendering,
  click-to-enlarge, alt text, preloading, missing-image warnings.
- **ZIP bank import** — import a `bank.json` + `questions.json` + `assets/` package
  locally (images become local data URLs; no external upload).
- **Calculator providers** — official Desmos (SAT-restricted) and open-source
  (graphing, editable x/y data table, scientific, degree/radian, combinatorics).
- **Structured calculator strategies** — "Send setup to calculator" per question,
  with no answer leakage.
- **Scoring** — total score plus domain, skill, difficulty, and bank breakdowns.
- **PDF question extractor** — a local CLI (`tools/pdf-question-extractor/`) that
  turns a PDF of SAT questions into an importable bank via LM Studio.
- Responsive layout, offline service worker, GitHub Pages deployment.

## Architecture

```
src/
  calculator/            CalculatorProvider abstraction (desmos + open-source)
  questions/             banks (manifest/registry), importer, zip-import, images, strategy
  test/                  generator (combined/random/filters), scoring
  state/store.ts         session persistence (config, order, responses, calculator state)
  types.ts               Domain types (Question, Bank, TestConfig, SessionState)
  main.ts                Three-screen app (home → test → results)
tools/pdf-question-extractor/   Python CLI (PyMuPDF + LM Studio)
```

Questions are keyed internally as `bankId::questionId` so identically-named
questions across banks never collide.

### Reference summary: questions with images

Tables, diagrams, graphs, and other figures use one typed `assets[]` contract on
the question. A bank owns the base path, the renderer resolves that path without
mutating bank data, and all visual types share responsive display, alt text,
missing-image handling, preloading, keyboard access, and click-to-enlarge.

See [Question images: architectural reference](docs/QUESTION_IMAGES.md) for the
built-in-bank and ZIP layouts, JSON examples, authoring rules, and acceptance
checklist. This is the Module 2 extension of the image support introduced in the
previous Git module.

### Calculator-provider selection

`selectCalculatorProvider()` reads `VITE_DESMOS_API_KEY`. No key → open-source.
With a key → load Desmos v1.12 once (12s timeout); any failure (rejected/expired
key, offline, timeout) falls back to open-source with a human-readable status.

## Configuration

### Student accounts

Edit `public/users.json` to add or disable student accounts. Each account needs a
unique `id`, `username`, `password`, and optional `displayName`; set `active` to
`false` to block sign-in. The included demo login is `student` / `sat123`.

Profiles and adaptive progress recommendations are stored per account in that
browser's local storage. This intentionally simple plaintext password system is
for a trusted classroom/local deployment only, because visitors can read files
published with a static web app.

```bash
# .env.local (never committed)
VITE_DESMOS_API_KEY=<your key>
```

For GitHub Pages, add a repository secret `DESMOS_API_KEY`
(**Settings → Secrets and variables → Actions → New repository secret**). The
workflow injects it at build time and never prints it.

> A browser API key is always visible in network traffic and the built client.
> The secret prevents source-code exposure only. The app never displays the key,
> and the service worker never caches the Desmos script (whose URL carries it).

## Development

```bash
npm install
npm run dev        # local dev server
npm run test       # Vitest (unit/behavior tests)
npm run build      # tsc + Vite production build
npm run check      # test + build
npm audit
```

## PDF question extractor

```bash
cd tools/pdf-question-extractor
python -m pip install -r requirements.txt
python extract.py practice.pdf --model <text-model> --vision-model <vision-model>
python extract.py --selftest   # offline self-test
```

See `tools/pdf-question-extractor/README.md` for the full CLI and the
text-model vs. vision-model distinction.

## Publish on GitHub Pages

1. Push to `main`.
2. **Settings → Pages → Build and deployment → GitHub Actions**.
3. Add the `DESMOS_API_KEY` secret (above).
4. The workflow tests, builds, and publishes after each push.

The Vite build uses relative `./` paths, so it works under any repository name.

## Desmos usage and limitations

API version **v1.12**, loaded from `www.desmos.com` (never self-hosted or cached).
SAT configuration: `images:false`, `folders:false`, `notes:false`,
`forceLogModeRegressions:true`. Full command compatibility is in
[`docs/DESMOS_COMPATIBILITY.md`](docs/DESMOS_COMPATIBILITY.md). Browser-level
checks are in [`tests/manual/README.md`](tests/manual/README.md).

## Open-source components

math.js (Apache-2.0), function-plot (MIT), DOMPurify (Apache-2.0/MPL-2.0),
JSZip (MIT/GPL-3.0), KaTeX fonts (MIT).
