---
"@shayc/open-board-format": minor
---

Add opt-in zip-bomb protection: `loadBoard`, `loadOBZ`, `extractOBZ`, and `unzip` accept an optional `UnzipLimits` (`maxEntrySize`, `maxTotalOriginalSize`, `maxEntries`) checked against declared ZIP metadata before inflation. Exceeding a limit aborts extraction with a new `OBFError` code `"archive-too-large"`. No limits are applied by default; existing call sites are unaffected.
