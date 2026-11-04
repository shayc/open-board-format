---
"@shayc/open-board-format": minor
---

`isZip` now accepts any `ArrayBufferView` (such as a `Uint8Array` or Node `Buffer`) as well as an `ArrayBuffer`, reading a view from its own `byteOffset`.
