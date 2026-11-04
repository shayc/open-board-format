---
"@shayc/open-board-format": patch
---

`parseManifest` (and so `extractOBZ` and `loadBoard`) now strips a leading UTF-8 BOM from `manifest.json`, matching `parseOBF`.
