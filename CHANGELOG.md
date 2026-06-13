# @shayc/open-board-format

## 0.6.1

### Patch Changes

- 19ad2c6: Condense multi-line JSDoc comments on schema type aliases to single lines and tidy doc wording in `obz.ts` and `test-utils.ts`. Documentation only — no API or behavior changes.

## 0.6.0

### Minor Changes

- 0977576: Align board validation with the OBF spec:

  - **Buttons:** absolute positioning now requires all of `top`, `left`, `width`, and `height` together (or none of them), matching the spec's "all four attributes are required for all buttons" rule. A partial positioning set (e.g. only `top`) is now rejected; grid-only buttons are unaffected.
  - **OBZ manifest:** `paths.images` is now optional (consistent with `paths.sounds`), so manifests that omit empty image/sound maps validate. `paths.boards` remains required.

## 0.5.0

### Minor Changes

- 24535c7: Throw a typed `OBFError` instead of plain `Error`. Every failure now carries a discriminated `error.info`, so consumers branch on `error.info.code` (e.g. `"missing-resource"`, `"invalid-board"`, `"not-zip"`) and read structured fields off each variant — no message parsing.

  - New exports: `OBFError` (class), and the `OBFErrorInfo`, `OBFErrorCode`, and `OBFIssue` types.
  - Validation failures (`invalid-board`, `invalid-manifest`) expose the Zod `issues` list on `error.info`. The underlying error — the `ZodError`, or the `JSON.parse`/fflate failure for `not-json`/`unreadable-zip`/`zip-failed` — is always on the standard `error.cause` and never duplicated on `info`.
  - An `internal` code marks a library-invariant violation (a bug here), not something callers can recover from.
  - **Breaking:** thrown errors are now `OBFError` (`error.name` is `"OBFError"`) and message strings changed. Branch on `error.info.code` rather than matching `error.message`. The internal `buildJsonParseErrorMessage` helper was removed.

## 0.4.2

### Patch Changes

- d2beda3: docs: ship the OBF spec mirror (`docs/external/open-board-format.md`) in the npm package

  The README already points at this file; including it makes that link resolve
  inside `node_modules` and gives offline tooling and coding agents the full
  format semantics (specialty actions, string-list fallback, ID uniqueness)
  that type declarations can't carry.

## 0.4.1

### Patch Changes

- e7c9b47: docs: polish public API JSDoc for better IntelliSense

  - Document every exported type alias (`OBFBoard`, `OBFButton`, …) so hover tooltips show a description instead of just the expanded type
  - Move `ParsedOBZ` field docs from `@property` tags onto the fields themselves so they surface in editors
  - Clarify `data_url` as an API endpoint (not a `data:` URI) and note it is outside the `data` → `path` → `url` fallback chain
  - Document `action` vs `actions` precedence per the OBF spec
  - Correct fflate compression-level scale (0–9), standardize `@throws` phrasing, example quoting, and module headers; tag `buildJsonParseErrorMessage` as `@internal`

## 0.4.0

### Minor Changes

- bdf9fc5: Add `rootBoard` to `ParsedOBZ`: `extractOBZ` and `loadOBZ` now resolve the package's entry-point board (the one `manifest.root` points at) and return it directly, so consumers no longer need to invert `manifest.paths.boards` to find the home board.

  Extraction is also stricter: each board's `id` must match its key in `manifest.paths.boards`. Archives where they disagree now throw `Invalid OBZ: board at "<path>" has id "<id>" but the manifest declares it as "<key>"`. Such archives were previously accepted, but their boards were unreachable by `load_board.id` navigation, so this turns a silent inconsistency into a clear error.

## 0.3.0

### Minor Changes

- 8836a93: `loadBoard` now accepts an `ArrayBuffer` in addition to a `File`, so Node and fetch-based consumers can use format detection without constructing a `File`.

### Patch Changes

- 8836a93: Harden OBZ validation:

  - `createOBZ` now throws on duplicate board ids instead of silently keeping only the last board with a given id.
  - Manifest validation (`OBFManifestSchema`, `parseManifest`, `extractOBZ`) now rejects manifests whose `root` is not listed in `paths.boards`, instead of extracting an archive whose root board can't be resolved.

## 0.2.0

### Minor Changes

- c03eaa7: Add `loadBoard(file)`, a format-detecting entry point. It reads the file once, sniffs the ZIP magic prefix, and returns a discriminated union — `{ format: "obz", archive } | { format: "obf", board }`. Consumers can now accept either an `.obf` board or an `.obz` package from a single file input without inspecting the extension or re-deriving the OBF-vs-OBZ distinction themselves. Also exports the accompanying `LoadedBoard` type.

## 0.1.7

### Patch Changes

- eff0aae: `createOBZ` now guarantees the archive it produces is internally consistent: it throws if a board declares an image or sound `path` with no matching entry in `resources`, and throws if a `resources` entry would overwrite the generated `manifest.json` or a board file. This mirrors the missing-board check `extractOBZ` already performs, so a package that round-trips through `createOBZ` → `extractOBZ` can no longer reference files that aren't in the archive. Use the lower-level `zip()` primitive if you need to assemble an archive without these guarantees.

## 0.1.6

### Patch Changes

- e31c5bd: Prefix the OBZ missing-board extraction error with `Invalid OBZ:` so it matches the convention used by every other OBZ failure, letting consumers reliably detect malformed packages by message prefix.

## 0.1.5

### Patch Changes

- 222eda9: Rewrite the README for clarity: sharper overview that maps each entry point to its input shape, new Errors and Security sections, and a note that validation preserves unknown fields (vendor extensions survive a parse/stringify round trip). Also sort `package.json` keywords.

## 0.1.4

### Patch Changes

- b2fa636: Expose a `types` condition in the package `exports` map so TypeScript consumers resolve declarations for the package entry point.

## 0.1.3

### Patch Changes

- 8f75789: - `createOBZ` now validates each board against `OBFBoardSchema` before writing it into the archive, so invalid input fails loudly instead of producing a structurally broken `.obf` (closes #13).
  - `OBFImageSchema` is built with `.extend()` instead of `.and()`, so it is a regular object schema again (supports `.extend()`/`.pick()`/`.shape`); parsing behavior, including `ext_` passthrough, is unchanged.
  - Corrected misleading JSDoc on `ParsedOBZ.resources` (it holds every archive entry, not only media) and on `OBFLocaleCodeSchema` (a plain string, not strictly BCP 47 validated; closes #14).

## 0.1.2

### Patch Changes

- 3511f0f: Lower the `engines.node` floor from `>=24` to `>=22` so the library installs cleanly on both live LTS lines (Node 22 maintenance and 24 active). The shipped code only uses APIs available since Node 20, so the previous `>=24` requirement excluded Node 22 consumers for no technical reason.

## 0.1.1

### Patch Changes

- d8a0c9f: Set up release tooling: Prettier, ESLint, Changesets, publint, CI and release workflows.
