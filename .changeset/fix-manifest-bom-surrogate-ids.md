---
"@shayc/open-board-format": patch
---

`parseManifest` (and so `extractOBZ`/`loadBoard`) now strips a leading UTF-8 BOM from `manifest.json`, matching `parseOBF`. `createOBZ` now throws `OBFError` `invalid-board` instead of a bare `URIError` when a board id contains a lone surrogate.
