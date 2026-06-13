---
"@shayc/open-board-format": minor
---

Throw a typed `OBFError` instead of plain `Error`. Every failure now carries a discriminated `error.info`, so consumers branch on `error.info.code` (e.g. `"missing-resource"`, `"invalid-board"`, `"not-zip"`) and read structured fields off each variant — no message parsing.

- New exports: `OBFError` (class), and the `OBFErrorInfo`, `OBFErrorCode`, and `OBFIssue` types.
- Validation failures (`invalid-board`, `invalid-manifest`) carry the Zod `issues` list plus the underlying `ZodError` as `error.cause`; decode failures (`not-json`, `unreadable-zip`, `zip-failed`) carry the underlying error as `cause`.
- **Breaking:** thrown errors are now `OBFError` (`error.name` is `"OBFError"`) and message strings changed. Branch on `error.info.code` rather than matching `error.message`. The internal `buildJsonParseErrorMessage` helper was removed.
