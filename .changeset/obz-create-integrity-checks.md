---
"@shayc/open-board-format": patch
---

`createOBZ` now guarantees the archive it produces is internally consistent: it throws if a board declares an image or sound `path` with no matching entry in `resources`, and throws if a `resources` entry would overwrite the generated `manifest.json` or a board file. This mirrors the missing-board check `extractOBZ` already performs, so a package that round-trips through `createOBZ` → `extractOBZ` can no longer reference files that aren't in the archive. Use the lower-level `zip()` primitive if you need to assemble an archive without these guarantees.
