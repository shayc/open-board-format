---
"@shayc/open-board-format": patch
---

Correct and tighten the API doc comments. `extractOBZ` now lists each error code it throws, including `"not-json"` for a board, and notes that `manifest.json` is required. `createOBZ` documents where it writes boards and the manifest, and that a board ID with a lone UTF-16 surrogate throws `URIError`. The `invalid-board` `boardId` field is documented as set only by `createOBZ`, and the media `data_url`, `UnzipLimits`, and `OBFIssue` docs are corrected or shortened.
