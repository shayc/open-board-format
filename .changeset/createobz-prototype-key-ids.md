---
"@shayc/open-board-format": patch
---

`createOBZ` no longer fails with a false `conflicting-paths` error when an image or sound ID matches an `Object.prototype` member such as `constructor` or `toString`. The ID `__proto__`, which an OBZ manifest cannot represent, now reports `invalid-board` with a clear issue for boards and path-backed media instead of an `internal` or `conflicting-paths` error. `zip` rejects an entry named exactly `__proto__` with `zip-failed` instead of silently dropping it.
