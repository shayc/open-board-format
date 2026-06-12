---
"@shayc/open-board-format": minor
---

Add `rootBoard` to `ParsedOBZ`: `extractOBZ` and `loadOBZ` now resolve the package's entry-point board (the one `manifest.root` points at) and return it directly, so consumers no longer need to invert `manifest.paths.boards` to find the home board.

Extraction is also stricter: each board's `id` must match its key in `manifest.paths.boards`. Archives where they disagree now throw `Invalid OBZ: board at "<path>" has id "<id>" but the manifest declares it as "<key>"`. Such archives were previously accepted, but their boards were unreachable by `load_board.id` navigation, so this turns a silent inconsistency into a clear error.
