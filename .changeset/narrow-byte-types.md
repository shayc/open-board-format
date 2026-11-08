---
"@shayc/open-board-format": minor
---

Type the bytes this package returns as `Uint8Array<ArrayBuffer>` instead of a plain `Uint8Array`: `unzip()`, `zip()`, and `ParsedOBZ.resources`. They were always backed by a regular `ArrayBuffer`, so callers no longer need a cast to pass them to APIs such as `Blob` or `crypto.subtle`. Inputs still accept any `Uint8Array` or `ArrayBuffer`.
