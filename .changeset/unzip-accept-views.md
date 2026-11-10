---
"@shayc/open-board-format": minor
---

`unzip` now accepts any `ArrayBufferView` as well as an `ArrayBuffer`, so the output of `zip` can be passed straight back in. `extractOBZ` and `loadBoard` no longer copy a typed array that spans its whole buffer before extraction.
