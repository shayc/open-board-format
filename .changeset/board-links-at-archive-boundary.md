---
"@shayc/open-board-format": major
---

Board links now survive repackaging. `createOBZ` writes every `load_board.path` itself: a link whose `id` names a supplied board points at the file `createOBZ` writes for it, and any other link is packaged without a `path`, instead of keeping a path from an earlier layout that resolved to the wrong file or none. `extractOBZ`, `loadOBZ`, and `loadBoard` give a link that names a packaged board only by `path` that board's `id`, so links can be followed by ID alone. Callers that rewrote link paths before `createOBZ`, or resolved link IDs from the manifest after extraction, can drop that code.

The README no longer documents the `boards/<encoded-id>.obf` layout; read board paths from `manifest.paths.boards`.
