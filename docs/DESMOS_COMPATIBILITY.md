# Desmos compatibility matrix

This document records which Digital SAT calculator commands are supported by the
**official Desmos provider** (Desmos API v1.12) versus the **open-source offline
provider** (math.js + function-plot). It is the honest source of truth for what
works where — the application never presents an unsupported capability as
working.

- **Official Desmos** = `DesmosCalculatorProvider` (requires a valid API key + network).
- **Open-source** = `OpenSourceCalculatorProvider` (offline fallback).
- **Test status** refers to automated tests in `tests/` or documented manual checks in `tests/manual/`.

> The application is an independent classroom tool. It is **not** affiliated with
> or endorsed by College Board or Desmos, and it does not replicate Bluebook trade
> dress or proprietary interface details.

## Configuration applied to the official provider

Verified against the Desmos API v1.12 documentation:

| Option | Value | Effect |
| --- | --- | --- |
| `images` | `false` | Disables image uploads |
| `folders` | `false` | Disables folder creation |
| `notes` | `false` | Disables text notes |
| `forceLogModeRegressions` | `true` | Linearizable regressions default to log mode; the toggle is hidden |

All other controls (keypad, expressions list, settings menu, zoom, trace, points
of interest, sliders, tables) are left enabled to match the full calculator
experience. Braille mode, screen-reader reporting and projector mode remain
available through the calculator's own settings.

## Capability matrix

### Equations and systems

| Command / behaviour | Official Desmos | SAT relevance | Open-source | Test status | Known limitation |
| --- | --- | --- | --- | --- | --- |
| Complete equations (`y=2x+1`) | ✅ | High | ✅ | automated | — |
| Graph both sides of a 1-var equation (`y=2^x`, `y=13`) | ✅ | High | ✅ | automated | — |
| Solve systems via intersections | ✅ | High | ✅ (points of intersection not auto-labelled) | manual | open-source has no auto intersection label |
| Zeros via `y=0` intersection | ✅ | High | ✅ | manual | — |
| Vertical/horizontal lines (`x=5`, `y=3`) | ✅ | Medium | ❌ (vertical line) | manual | open-source graphs `y=c` only |
| Multiple intersections | ✅ | Medium | ✅ (visual) | manual | open-source requires manual reading |
| Domain-restricted solutions | ✅ | Medium | ❌ | manual | open-source cannot encode restrictions |

### Functions and graphs

| Command / behaviour | Official Desmos | SAT relevance | Open-source | Test status | Known limitation |
| --- | --- | --- | --- | --- | --- |
| `f(x)=...` | ✅ | High | ✅ | automated | — |
| Function evaluation `f(3)` | ✅ | High | ❌ (no named-function persistence) | manual | open-source evaluates expressions, not named functions |
| Zeros / intercepts / vertices | ✅ (points of interest) | High | ✅ (visual) | manual | open-source has no auto vertex/intercept labels |
| Min / max points | ✅ | High | ✅ (visual) | manual | — |
| Symmetry / end behavior | ✅ (visual) | Medium | ✅ (visual) | manual | — |
| Multiple expressions, colors, visibility | ✅ | High | ✅ | automated | — |
| Pan / zoom / reset / windows | ✅ | High | ✅ | automated | — |
| Tables of values | ✅ | High | ✅ (x→y for one function) | automated | open-source: single function, fixed step |
| Parameter sliders | ✅ | Medium | ❌ | manual | open-source cannot create sliders |

### Inequalities and regions

| Command / behaviour | Official Desmos | SAT relevance | Open-source | Test status | Known limitation |
| --- | --- | --- | --- | --- | --- |
| `y > 2x − 3`, `y ≤ 2x − 3`, `x ≤ 5` | ✅ | High | ❌ | automated (rejected) | open-source shows "requires official Desmos" |
| Solid/dashed boundaries, shading | ✅ | High | ❌ | — | — |
| Overlapping feasible regions | ✅ | Medium | ❌ | — | — |

### Restrictions and piecewise functions

| Command / behaviour | Official Desmos | SAT relevance | Open-source | Test status | Known limitation |
| --- | --- | --- | --- | --- | --- |
| `f(x)=x^2 {0≤x≤5}` | ✅ | High | ❌ | automated (rejected) | — |
| `f(x)={x<0:-x, x≥0:x^2}` | ✅ | Medium | ❌ | automated (rejected) | — |
| Inclusive/exclusive endpoints, branches | ✅ | Medium | ❌ | — | — |

### Quadratic and nonlinear models

| Command / behaviour | Official Desmos | SAT relevance | Open-source | Test status | Known limitation |
| --- | --- | --- | --- | --- | --- |
| Quadratic graphs / roots / vertex | ✅ | High | ✅ (visual) | automated | — |
| Quadratic regression `y_1~ax_1^2+bx_1+c` | ✅ | Medium | ❌ | manual | — |
| Exponential regression `y_1~ab^{x_1}` | ✅ | Medium | ❌ | manual | — |
| Power regression `y_1~ax_1^b` | ✅ | Low | ❌ | manual | — |
| Log-mode regression restriction | ✅ (`forceLogModeRegressions`) | Medium | n/a | manual | — |

### Tables, lists and statistics

| Command | Official Desmos | SAT relevance | Open-source | Test status | Known limitation |
| --- | --- | --- | --- | --- | --- |
| `x_1`, `y_1` table columns | ✅ | High | ❌ | manual | open-source table is x→f(x) only |
| `mean(y_1)`, `median(y_1)` | ✅ | Medium | ✅ | automated | — |
| `min(y_1)`, `max(y_1)` | ✅ | Medium | ✅ | automated | — |
| `total(y_1)` | ✅ | Medium | ✅ (`total` alias) | automated | — |
| `length(y_1)` | ✅ | Medium | ✅ (`length` alias) | automated | — |
| `stdev(y_1)`, `stdevp(y_1)` | ✅ | Low | ✅ | automated | — |
| Quartiles / quantiles | ✅ (`quantile`) | Low | ❌ | — | not added (non-SAT) |
| `sort`, `unique` | ✅ | Low | ❌ | — | not added |
| List indexing `y_1[1]` | ✅ | Low | partial (math.js indexing) | manual | not verified |
| List arithmetic | ✅ | Low | ✅ (math.js vector ops) | manual | — |
| Lists from intervals / `sequence` | ✅ | Low | ❌ | — | not added |

### Regression and residuals

| Command / behaviour | Official Desmos | SAT relevance | Open-source | Test status | Known limitation |
| --- | --- | --- | --- | --- | --- |
| `y_1~mx_1+b` (linear regression) | ✅ | Medium | ❌ | manual | — |
| Parameter display | ✅ | Medium | ❌ | — | — |
| Predicted values | ✅ | Medium | ❌ | — | — |
| Residuals `r=y_1−(mx_1+b)` | ✅ | Medium | ❌ | manual | — |
| Residual plots | ✅ | Low | ❌ | — | — |

### Trigonometry

| Command / behaviour | Official Desmos | SAT relevance | Open-source | Test status | Known limitation |
| --- | --- | --- | --- | --- | --- |
| Degree mode | ✅ | High | ✅ (evaluation + table) | automated | open-source graph stays in radians |
| Radian mode | ✅ | High | ✅ | automated | — |
| `sin`, `cos`, `tan` | ✅ | High | ✅ | automated | — |
| Inverse trig | ✅ | High | ✅ | automated | — |
| Restricted angle intervals | ✅ | Medium | ❌ | — | — |
| Multiple periodic solutions | ✅ | Medium | ✅ (visual) | manual | — |
| Clear angle-mode indicator | ✅ (settings) | Medium | ✅ (header toggle) | automated | — |

### Rational, radical and absolute-value expressions

| Command / behaviour | Official Desmos | SAT relevance | Open-source | Test status | Known limitation |
| --- | --- | --- | --- | --- | --- |
| Fractions, radicals, absolute value | ✅ | High | ✅ (evaluation) | automated | — |
| Graphing both sides | ✅ | High | ✅ | automated | — |
| Intersection-based solving | ✅ | High | ✅ (visual) | manual | — |
| Denominator exclusions / extraneous checks | ✅ | Medium | ❌ (no auto detection) | — | — |

### Probability, combinatorics and sequences

| Command / behaviour | Official Desmos | SAT relevance | Open-source | Test status | Known limitation |
| --- | --- | --- | --- | --- | --- |
| `nCr` | ✅ | High | ✅ | automated | — |
| `nPr` | ✅ | High | ✅ | automated | — |
| `n!` | ✅ | High | ✅ | automated | — |
| `sum` / `total` | ✅ | Medium | ✅ | automated | — |
| `sequence` (list generation) | ✅ | Low | ❌ | — | not added |
| Probability distributions | ✅ | Low | ❌ | — | not added (non-SAT) |

### Coordinate geometry

| Command / behaviour | Official Desmos | SAT relevance | Open-source | Test status | Known limitation |
| --- | --- | --- | --- | --- | --- |
| Points / movable points | ✅ | Medium | ❌ | — | — |
| Coordinate inspection (trace) | ✅ | High | ✅ (drag) | manual | — |
| Distance / midpoint | ✅ (`distance`, `midpoint`) | Medium | ❌ | — | not added |
| Circles / parabolas | ✅ | High | ✅ parabola; ❌ circle | manual | circle is implicit → Desmos only |
| Polygons | ✅ | Low | ❌ | — | not added |
| Intersections between relations | ✅ | High | partial (function intersections only) | manual | — |

## Summary of open-source limitations

The open-source provider does **not** silently approximate unsupported commands.
It explicitly refuses and shows a message directing the student to the official
Desmos provider for:

- Inequalities and shaded regions
- Implicit equations (circles, general conics)
- Piecewise functions and domain restrictions
- Regressions (`~`)
- Sliders
- Arbitrary data tables, `sequence`, quartiles, and distributions

Everything else (explicit functions, scientific evaluation, combinatorics,
factorials, summation, degree/radian trig, and list statistics) works offline.
