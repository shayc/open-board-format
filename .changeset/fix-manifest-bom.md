---
"@shayc/open-board-format": patch
---

`parseManifest` now strips a leading UTF-8 BOM from its input string, matching `parseOBF`. `extractOBZ` and `loadBoard` were not affected, because they decode archive bytes with `TextDecoder`, which already drops a BOM.
