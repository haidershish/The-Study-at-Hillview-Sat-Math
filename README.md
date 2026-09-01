# SAT Math Lab

An offline-first Digital SAT Math practice application with an embedded open-source graphing and scientific calculator. It runs as a static site on GitHub Pages—no server, account, API key, or Desmos dependency is required.

## Included

- Digital SAT question player, navigation, timer, review flags and scoring
- Interactive 2D function graphing with multiple expressions
- Scientific expression input with SAT-focused shortcut keys
- Function tables, combinations, permutations, factorials and summation
- Validated JSON question-bank import and session export
- Local progress saving and offline service-worker cache
- Responsive Chromebook, desktop, tablet and phone layout
- Automated tests, production build and GitHub Pages deployment

## Development

```bash
npm install
npm run dev
```

Run the complete quality check with `npm run check`.

## Publish on GitHub Pages

1. Push the repository to GitHub using `main` or `master`.
2. Open **Settings → Pages** in the GitHub repository.
3. Under **Build and deployment**, select **GitHub Actions**.
4. The included workflow tests, builds and publishes the site after each push.

The Vite build uses relative asset paths, so it works under any GitHub repository name and can also be served by another static web server.

## Question-bank JSON

Question banks are arrays of objects with `id`, `domain`, `skill`, `difficulty`, `prompt`, `type`, `answer`, and `explanation`. Multiple-choice questions also include `choices`. See `src/questions/sample.ts` for examples.

## Open-source components

- math.js — Apache-2.0
- function-plot — MIT
- DOMPurify — Apache-2.0 or MPL-2.0

This is an independent classroom tool. It is not affiliated with or endorsed by College Board or Desmos.
