---
"@shayc/open-board-format": minor
---

Align board validation with the OBF spec:

- **Buttons:** absolute positioning now requires all of `top`, `left`, `width`, and `height` together (or none of them), matching the spec's "all four attributes are required for all buttons" rule. A partial positioning set (e.g. only `top`) is now rejected; grid-only buttons are unaffected.
- **OBZ manifest:** `paths.images` is now optional (consistent with `paths.sounds`), so manifests that omit empty image/sound maps validate. `paths.boards` remains required.
