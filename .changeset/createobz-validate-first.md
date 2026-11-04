---
"@shayc/open-board-format": patch
---

`createOBZ` now validates and normalizes every board before anything else. Boards with numeric IDs now package correctly when `rootBoardId` is the string form, instead of failing with `unknown-root`, and an invalid board reports `invalid-board` before any root or duplicate checks.
