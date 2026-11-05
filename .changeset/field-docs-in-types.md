---
"@shayc/open-board-format": patch
---

Field documentation now appears in editor hovers for all OBF data types and schemas. Previously the published type declarations dropped every per-field comment, so fields such as `OBFButton.label` showed no description. The docs now also state validation rules that were only visible in the source, such as empty-string URLs and IDs parsing to `undefined` and the 1–100 grid size limit. Object types such as `OBFBoard` are now named interfaces with the same structure as before.
