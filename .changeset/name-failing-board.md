---
"@shayc/open-board-format": minor
---

Errors now say which board failed. When a board inside an `.obz` fails validation, `extractOBZ`, `loadOBZ`, and `loadBoard` report `invalid-board` with the manifest's `boardId` and the board's archive `path`; when it is not valid JSON, `not-json` carries the `path`. `validateOBF` and `parseOBF` now report the input's own `id` as `boardId` when it is a non-empty string or number, as `createOBZ` already did. The new `path` fields are optional additions to `OBFErrorInfo`, and the messages include them (for example `Invalid OBF board "b" at "boards/b.obf"`).
