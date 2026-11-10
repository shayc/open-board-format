---
"@shayc/open-board-format": minor
---

`extractOBZ`, `loadOBZ`, and `loadBoard` now say which board failed: a `not-json` or `invalid-board` error for a board inside an archive carries `info.boardId` and `info.path`, and names both in its message.
