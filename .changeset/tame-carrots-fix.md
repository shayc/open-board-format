---
"@shayc/open-board-format": minor
---

`loadBoard` and `extractOBZ` now accept a `Blob` or any typed-array view (e.g. a Node `Buffer`/`Uint8Array`) in addition to `File` and `ArrayBuffer`, instead of throwing a raw `TypeError` on those inputs. This removes the need to manually slice a `Buffer` into an `ArrayBuffer` before calling `loadBoard` in Node.
