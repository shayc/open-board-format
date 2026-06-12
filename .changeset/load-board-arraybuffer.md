---
"@shayc/open-board-format": minor
---

`loadBoard` now accepts an `ArrayBuffer` in addition to a `File`, so Node and fetch-based consumers can use format detection without constructing a `File`.
