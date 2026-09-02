# Question images: architectural reference

Questions may contain one or more visual assets. Tables, diagrams, graphs, and
general figures all use the same `QuestionAsset` contract; `type` records the
visual's meaning while the renderer supplies shared responsive, accessible, and
click-to-enlarge behavior.

## Data flow

```text
question JSON
  -> importer validates assets[]
  -> bank manifest supplies assetBase
  -> resolveAssets() creates render-ready URLs
  -> renderAssetsHTML() creates accessible figures
  -> wireAssets() handles loading errors, keyboard access, and enlargement
  -> preloadImages() warms the next question's images
```

The question JSON is the source of truth. Images do not belong in the prompt as
HTML or Markdown, and presentation-specific markup does not belong in the bank.

## Built-in bank example

Store the file beneath `public`, for example:

```text
public/banks/module-2/assets/q-014-table.png
```

Add the bank's base once in `src/questions/banks.ts`:

```ts
{
  id: 'module-2',
  title: 'Module 2',
  description: 'Module 2 practice questions.',
  questions: module2Questions as Question[],
  assetBase: './banks/module-2',
}
```

Then attach the image to its question:

```json
{
  "id": "PSDA-014",
  "prompt": "The table shows values of x and y. Which equation models the relationship?",
  "type": "multiple-choice",
  "choices": [
    { "id": "A", "text": "y = 2x + 1" },
    { "id": "B", "text": "y = 3x - 1" }
  ],
  "answer": "A",
  "explanation": "Each increase of 1 in x increases y by 2, and y = 1 when x = 0.",
  "assets": [
    {
      "id": "q-014-table",
      "type": "table",
      "src": "assets/q-014-table.png",
      "alt": "Table with x-values 0, 1, 2 and y-values 1, 3, 5"
    }
  ]
}
```

Use `type: "diagram"` for geometry or process diagrams, `type: "graph"` for
coordinate plots or scatterplots, and `type: "table"` for a table that must be
seen as presented. Multiple objects in `assets` render in array order.

## ZIP-imported bank

Package portable banks as:

```text
module-2.zip
  bank.json
  questions.json
  assets/
    q-014-table.png
    q-021-graph.svg
```

References in `questions.json` use `assets/<filename>`. The ZIP importer checks
that every referenced file exists and converts it to a local data URL; nothing
is uploaded. Prefer `assets[]`. `assetIds[]` remains supported only for legacy
extractor output.

## Authoring rules

- Write useful `alt` text that conveys the data needed to answer the question;
  do not write only "graph" or "image."
- Use SVG for crisp line diagrams and plots when available; use PNG/WebP for
  scans or complex raster content. ZIP import supports PNG, JPEG, WebP, GIF, and
  SVG.
- Crop whitespace, keep labels legible on a phone, and avoid encoding the
  correct answer in a filename or alt text.
- Use an image table only when its visual formatting is part of the question.
  Use `calculatorStrategy.table` separately when the intent is to send editable
  x/y data to the calculator; that field is not a question image.
- Every visual question must remain understandable when enlarged and must show a
  clear "Image unavailable" state if loading fails.

## Acceptance checklist

1. The asset has a unique `id`, semantic `type`, valid `src`, and descriptive `alt`.
2. A built-in asset exists beneath its declared `assetBase`, or a ZIP contains it.
3. The question renders at desktop and mobile widths and opens by click, Enter,
   or Space.
4. The image does not reveal the answer, and the explanation refers to the
   visual unambiguously.
5. `npm run check` passes before the bank is committed.
