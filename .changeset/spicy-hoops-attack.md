---
"@shayc/open-board-format": minor
---

Add opt-in zip-bomb protection: `loadBoard`, `loadOBZ`, `extractOBZ`, and `unzip` accept an optional `UnzipOptions` with a `limits` field (`maxEntrySize`, `maxTotalOriginalSize`, `maxEntries`), checked per entry against declared ZIP metadata, keeping allocation bounded by the caps. Exceeding a limit aborts extraction with a new `OBFError` code `"archive-too-large"`. No limits are applied by default; existing call sites are unaffected.
