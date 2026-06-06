---
name: CRM matching question format
description: The actual CRM format for matching questions and how to normalize it.
---

## Rule
Matching question pairs are in `options: [{id:"pair-1", left:{text:"..."}, right:{text:"..."}}]` — the same `options` field used for MC answers, but with a different shape.

**Why:** The CRM does NOT use `matchingData`, `matching`, or `matchingPairs` fields for matching questions. The pairs live in `options` with nested `{text: "..."}` objects for left/right values.

**How to apply:**
1. In `normalizeMatchingData()` — add an `Array.isArray(raw)` guard at the top that redirects to `normalizeMatchingData({ pairs: raw })` so array input works.
2. In Format 2 (flat pairs) — use `extractText(pair["left"])` which handles both plain strings AND `{text:"..."}` objects.
3. In `normalizeQuestion()` — pass `rawOptions` as the last fallback: `normalizeMatchingData(q["matchingData"] ?? q["matching"] ?? q["matchingPairs"] ?? (q["type"]==="matching" ? rawOptions : null))`.
