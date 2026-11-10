---
"@shayc/open-board-format": minor
---

`extractOBZ`, `loadOBZ`, and `loadBoard` now say which board failed: a `not-json` or `invalid-board` error for a board inside an archive carries `info.boardId` and `info.path`, and names both in its message. `unzip` now accepts any `ArrayBufferView` as well as an `ArrayBuffer`, so the output of `zip` can be passed straight back in, and a typed array that spans its whole buffer is no longer copied before extraction.
