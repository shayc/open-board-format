---
"@shayc/open-board-format": patch
---

Drop directory-marker entries (paths ending in `/`) when unzipping, so `extractOBZ`'s `resources` map only ever contains real file content.
