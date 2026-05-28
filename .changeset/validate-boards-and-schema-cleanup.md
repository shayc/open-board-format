---
"@shayc/open-board-format": patch
---

- `createOBZ` now validates each board against `OBFBoardSchema` before writing it into the archive, so invalid input fails loudly instead of producing a structurally broken `.obf` (closes #13).
- `OBFImageSchema` is built with `.extend()` instead of `.and()`, so it is a regular object schema again (supports `.extend()`/`.pick()`/`.shape`); parsing behavior, including `ext_` passthrough, is unchanged.
- Corrected misleading JSDoc on `ParsedOBZ.resources` (it holds every archive entry, not only media) and on `OBFLocaleCodeSchema` (a plain string, not strictly BCP 47 validated; closes #14).
