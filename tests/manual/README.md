# Browser test harness (manual)

The project uses Vitest for unit/behavior tests (`npm run test`). Browser-level
behavior that depends on real DOM, layout, network, and the live Desmos API is
verified with this documented manual checklist.

Run a local build first:

```bash
npm run dev          # local dev server (no Desmos unless .env.local is set)
# or
npm run build && npm run preview
```

## Without a Desmos key (default)

| # | Check | Expected |
| --- | --- | --- |
| 1 | Load the app | 12 questions load; "Question 1 of 12" is shown |
| 2 | Calculator status badge | Shows **Open-source offline calculator** |
| 3 | Add an expression (`＋`), type `y=x^2-4` | Parabola renders; row is valid |
| 4 | Remove an expression (`×`) | Graph updates immediately |
| 5 | Graph two lines `y=2x+1` and `y=11-x` | Both lines render; intersection at x≈3.33 |
| 6 | Table tab → Generate | x/y values appear for the selected function |
| 7 | Scientific tab → evaluate `nCr(5,2)` | Result `= 10` |
| 8 | Toggle `RAD` → `DEG`, evaluate `sin(30)` | Result `= 0.5` |
| 9 | Question 1 → **Send setup to calculator** | Two lines are added; no answer is shown |
| 10 | Answer a few questions, reload the page | Answers, expressions, and angle mode persist |
| 11 | Resize to ~360px wide | Question and calculator stack vertically and stay usable |
| 12 | Type `y>2x-3` | Row shows "Inequalities … need the official Desmos calculator" and nothing is mis-graphed |

## With a Desmos key

1. Create `.env.local` with `VITE_DESMOS_API_KEY=<valid key>`.
2. Restart `npm run dev`.
3. Status badge shows **Official Desmos calculator**.
4. Open the calculator; the official Desmos UI renders (keypad, expressions, settings).
5. Send a setup for a Desmos-only question (e.g. the circle, `GEO-002`); the circle appears.
6. Switch degree/radian in the header and confirm the calculator reflects it.
7. Reload; calculator state (Desmos graph) is restored.

## GitHub Pages base-path loading

```bash
npm run build && npm run preview
```

- Assets load under a sub-path (the build uses relative `./` paths).
- The service worker registers at the correct base path and does **not** cache
  `www.desmos.com` script requests.
- A previously cached release does not pin an old deployment (navigation is
  network-first with offline fallback).
