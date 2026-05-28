# @shayc/open-board-format

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
