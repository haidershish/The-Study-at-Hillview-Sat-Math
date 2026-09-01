# SAT Math Lab

A Digital SAT Math practice application with an embedded graphing calculator.
When a valid [Desmos API](https://www.desmos.com/api/) key is configured, it uses
the **official Desmos calculator** in a SAT-compatible configuration; otherwise
it falls back to an **open-source offline calculator** (math.js + function-plot).
It deploys as a static site on GitHub Pages.

> This is an independent classroom tool. It is **not** affiliated with or
> endorsed by College Board or Desmos, and it does not replicate Bluebook trade
> dress or proprietary interface details.

## Features

- Digital SAT question player: navigation, timer, review flags, scoring, explanations
- **Calculator-provider abstraction** — the app never depends on Desmos globals
- Official Desmos provider (SAT-restricted: no images, folders, or notes; log-mode regressions)
- Open-source offline provider (graphing, tables, scientific, degree/radian, combinatorics)
- Structured per-question **"Send setup to calculator"** strategies (no answer leakage)
- Validated JSON question-bank import and session export
- Local progress + calculator-state persistence, offline service worker
- Responsive Chromebook / desktop / tablet / phone layout
- Automated tests, production build, GitHub Pages deployment

## Architecture

```
src/
  calculator/
    types.ts              CalculatorProvider interface + expression/status types
    factory.ts            Provider selection: key detection, load, fallback, status
    desmos-loader.ts      Loads Desmos API v1.12 script exactly once (with timeout)
    desmos-provider.ts    DesmosCalculatorProvider (official API)
    opensource-provider.ts OpenSourceCalculatorProvider (math.js + function-plot)
    engine.ts             math.js evaluation, angle mode, statistics/combinatorics
    graph.ts              function-plot adapter
  questions/
    sample.ts             Bundled 12-question bank
    importer.ts           JSON validation (including calculator strategies)
    strategy.ts           Strategy → expression conversion + Desmos-requirement check
  state/store.ts          localStorage session persistence
  main.ts                 Application shell (player, navigation, calculator host)
  types.ts                Domain types (Question, SessionState, CalculatorStrategy)
```

### Provider-selection flow

1. `selectCalculatorProvider()` reads `VITE_DESMOS_API_KEY`.
2. No key → **open-source** provider, status "Open-source offline calculator".
3. Key present → load `calculator.js` once (12s timeout); on success and a
   detectable `window.Desmos.GraphingCalculator` → **Desmos** provider.
4. Any failure (rejected/expired key, offline, timeout) → **open-source**
   provider with status "Desmos unavailable — offline calculator active".

The SAT shell talks to the calculator only through the `CalculatorProvider`
interface (`setExpressions`, `addExpression`, `removeExpression`, `clear`,
`getState`/`setState`, `resize`, `resetViewport`, `setAngleMode`).

## Local configuration

Copy `.env.example` to `.env.local` and set a Desmos API key for local
development:

```bash
# .env.local (never committed)
VITE_DESMOS_API_KEY=<your key>
```

The key is read at build time by Vite and inlined into the client bundle.
`.env` and `.env.*` are git-ignored (only the empty `.env.example` is committed).

## GitHub secret setup

For the GitHub Pages build to receive the key, add a repository secret:

```
Settings → Secrets and variables → Actions → New repository secret
Name:  DESMOS_API_KEY
Value: <your key>
```

The workflow injects it as `VITE_DESMOS_API_KEY` at build time. It is never
printed in logs.

> **Security note.** A browser API key is *always* observable to the end user in
> browser network traffic and in the built client. A GitHub secret prevents
> accidental source-code exposure but cannot make a client-side key truly
> private. The application never displays the key, and the service worker never
> caches the Desmos script (whose URL carries the key).

## Desmos usage and limitations

- API version: **v1.12**, loaded dynamically from `www.desmos.com`; never
  self-hosted, never cached by the service worker.
- SAT-compatible configuration: `images:false`, `folders:false`, `notes:false`,
  `forceLogModeRegressions:true`.
- Trial keys expire (typically after 90 days). When the key is rejected or
  expires, the app automatically falls back to the offline calculator.
- Full command compatibility is documented in
  [`docs/DESMOS_COMPATIBILITY.md`](docs/DESMOS_COMPATIBILITY.md).

## Offline behavior

The SAT shell and question bank work offline. When offline (or without a key),
the open-source provider is used. The service worker uses network-first
navigation so new deployments are always served, and it never caches the Desmos
script or the API key.

## Testing

```bash
npm run test        # Vitest unit/behavior tests (provider selection, loader, strategies, engine, importer)
npm run build       # tsc + Vite production build
npm audit           # dependency vulnerability scan
npm run check       # test + build
```

Browser-level checks (live Desmos, layout, base-path, session reload) are covered
by the documented checklist in [`tests/manual/README.md`](tests/manual/README.md).

## Publish on GitHub Pages

1. Push to `main` (or `master`).
2. **Settings → Pages → Build and deployment → GitHub Actions**.
3. Add the `DESMOS_API_KEY` secret (above).
4. The workflow tests, builds, and publishes after each push.

The Vite build uses relative `./` asset paths, so it works under any repository
name and on other static hosts.

## Open-source components

- math.js — Apache-2.0
- function-plot — MIT
- DOMPurify — Apache-2.0 / MPL-2.0
- KaTeX fonts (bundled) — MIT
