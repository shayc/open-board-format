---
"@shayc/open-board-format": patch
---

`createOBZ` now throws `OBFError` `invalid-board` instead of a bare `URIError` when a board id contains a lone surrogate.
