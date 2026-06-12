# `@shayc/open-board-format`

[![npm version](https://img.shields.io/npm/v/@shayc/open-board-format)](https://www.npmjs.com/package/@shayc/open-board-format)
[![CI](https://github.com/shayc/open-board-format/actions/workflows/ci.yml/badge.svg)](https://github.com/shayc/open-board-format/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/npm/l/@shayc/open-board-format.svg)](LICENSE)

A TypeScript toolkit for [Open Board Format](https://www.openboardformat.org/) — the open standard for Augmentative and Alternative Communication (AAC) boards. OBF (`.obf`) is a JSON file describing a single communication board: buttons, images, sounds, grid layout, metadata. OBZ (`.obz`) is a ZIP archive bundling one or more boards with their media and a `manifest.json`. This package parses, validates, and creates both.

- **Typed end to end** — every type is inferred from a [Zod](https://zod.dev/) schema, and every schema is exported for `safeParse` or composing into your own contracts.
- **Browser and Node.js 22+** — pure ESM, works against `File` and `ArrayBuffer`.
- **One entry point for either format** — `loadBoard` sniffs the bytes and tells you whether it found an `.obf` board or an `.obz` package.
- **Spec-faithful round trips** — unknown fields are preserved rather than stripped, so vendor extensions allowed by the OBF spec survive `parseOBF` → `stringifyOBF`.
- **Small footprint** — two runtime dependencies ([Zod](https://zod.dev/) and [fflate](https://github.com/101arrowz/fflate)), tree-shakeable, no side effects.

## Install

```bash
npm install @shayc/open-board-format
```

ESM only — CommonJS (`require`) is not supported.

## Quick start

```ts
import { loadBoard } from "@shayc/open-board-format";

// `file` came from drag-and-drop or <input type="file"> — could be .obf or .obz
const loaded = await loadBoard(file);

if (loaded.format === "obf") {
  console.log(loaded.board.buttons.length);
} else {
  console.log(loaded.archive.boards.size);
}
```

`loadBoard` accepts a `File` or `ArrayBuffer` and throws on invalid input (see [Errors](#errors)). Already holding a JSON string? `parseOBF(json)` returns a validated `OBFBoard` directly.

## Usage

### Which function do I need?

- **You have a single board (OBF).** Use `parseOBF` for a JSON string, `validateOBF` for an already-parsed object, `loadOBF` for a browser `File`. `stringifyOBF` serializes back out.
- **You have a package of boards plus media (OBZ).** Use `loadOBZ` for a `File`, `extractOBZ` for an `ArrayBuffer`, `createOBZ` to build a new one.
- **You don't know which you have.** Use `loadBoard` — it sniffs the bytes and returns a `{ format, ... }` union so you don't have to inspect the file extension yourself.

### Read an OBZ package

```ts
import { loadOBZ, extractOBZ } from "@shayc/open-board-format";

// From a File (e.g. drag-and-drop)
const { manifest, boards, resources } = await loadOBZ(file);

// Or from an ArrayBuffer (e.g. fetch response)
const parsed = await extractOBZ(buffer);
```

`boards` is keyed by board ID and `resources` by archive path. The manifest is the package's table of contents: `manifest.root` is the archive path of the home board, and `manifest.paths.boards` maps board IDs to paths. To get the home board:

```ts
// Validation guarantees `root` is listed in `paths.boards`, so the lookup always succeeds.
const [rootId] = Object.entries(manifest.paths.boards).find(
  ([, path]) => path === manifest.root,
)!;
const homeBoard = boards.get(rootId);
```

Resources are raw bytes. To display an image in the browser:

```ts
const bytes = resources.get("images/hello.png")!;
const url = URL.createObjectURL(new Blob([bytes]));
```

### Create an OBZ package

Buttons reference media by ID (`image_id`, `sound_id`); the board's `images`/`sounds` entries carry the archive `path`; the resources map supplies the bytes for each path. Every `path` a board declares must have a matching resource entry, or `createOBZ` throws.

```ts
import { createOBZ } from "@shayc/open-board-format";
import type { OBFBoard } from "@shayc/open-board-format";

const board: OBFBoard = {
  format: "open-board-0.1",
  id: "board-1",
  buttons: [{ id: "btn-1", label: "Hello", image_id: "img-1" }],
  grid: { rows: 1, columns: 1, order: [["btn-1"]] },
  images: [{ id: "img-1", path: "images/hello.png" }],
};

const pngBytes = new Uint8Array(/* ... */);
const resources = new Map([["images/hello.png", pngBytes]]);

const blob = await createOBZ([board], "board-1", resources);
```

The `manifest.json` is generated for you — boards are written to `boards/<id>.obf`, and `rootBoardId` (the second argument) selects the home board.

### Validate with Zod directly

```ts
import { OBFBoardSchema } from "@shayc/open-board-format";

const result = OBFBoardSchema.safeParse(data);

if (result.success) {
  console.log(result.data.buttons);
} else {
  console.error(result.error.issues);
}
```

## API

One naming convention covers the whole surface: `parse*` takes a JSON string, `validate*` takes an already-parsed object, `load*` takes a browser `File` (`loadBoard` also accepts an `ArrayBuffer`), `stringify*` returns a JSON string — and `extractOBZ`/`createOBZ` operate on whole archives.

### OBF (single board)

| Function              | Description                                                  |
| --------------------- | ------------------------------------------------------------ |
| `parseOBF(json)`      | Parse a JSON string into a validated `OBFBoard`              |
| `validateOBF(data)`   | Validate an unknown object as `OBFBoard` (throws on failure) |
| `stringifyOBF(board)` | Serialize an `OBFBoard` to a JSON string                     |
| `loadOBF(file)`       | Load an `OBFBoard` from a browser `File`                     |

### OBZ (board package)

| Function                                     | Description                                                   |
| -------------------------------------------- | ------------------------------------------------------------- |
| `loadOBZ(file)`                              | Load an OBZ package from a browser `File`                     |
| `extractOBZ(archive)`                        | Extract boards, manifest, and resources from an `ArrayBuffer` |
| `createOBZ(boards, rootBoardId, resources?)` | Create an OBZ package as a `Blob`                             |
| `parseManifest(json)`                        | Parse a `manifest.json` string into a validated `OBFManifest` |

### Format detection

| Function           | Description                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------- |
| `loadBoard(input)` | Detect OBF vs OBZ from a `File` or `ArrayBuffer` and load it; returns a `LoadedBoard` union |

### Utilities

| Function         | Description                                              |
| ---------------- | -------------------------------------------------------- |
| `isZip(archive)` | Check if an `ArrayBuffer` starts with a ZIP magic number |
| `zip(entries)`   | Create a ZIP from a map of paths to buffers              |
| `unzip(archive)` | Extract a ZIP into a map of paths to `Uint8Array`        |

### Types

| Type                  | Description                                                                           |
| --------------------- | ------------------------------------------------------------------------------------- |
| `OBFBoard`            | A single communication board                                                          |
| `OBFGrid`             | Grid layout (rows, columns, order)                                                    |
| `OBFButton`           | A button on the board                                                                 |
| `OBFButtonAction`     | Button action (spelling or specialty)                                                 |
| `OBFSpellingAction`   | Spelling action (e.g., `+s`)                                                          |
| `OBFSpecialtyAction`  | Specialty action (e.g., `:clear`)                                                     |
| `OBFLoadBoard`        | Reference to load another board                                                       |
| `OBFMedia`            | Common media properties (base for `OBFImage` and `OBFSound`)                          |
| `OBFImage`            | An image resource (extends `OBFMedia`)                                                |
| `OBFSound`            | A sound resource (alias of `OBFMedia`)                                                |
| `OBFSymbolInfo`       | Symbol set reference                                                                  |
| `OBFManifest`         | OBZ package manifest                                                                  |
| `ParsedOBZ`           | Return type of `extractOBZ` / `loadOBZ` — `{ manifest, boards, resources }`           |
| `LoadedBoard`         | Return type of `loadBoard` — `{ format: "obz", archive } \| { format: "obf", board }` |
| `OBFID`               | Unique identifier (string, coerced from number)                                       |
| `OBFFormatVersion`    | Format version string (e.g., `open-board-0.1`)                                        |
| `OBFLicense`          | Licensing information                                                                 |
| `OBFLocaleCode`       | BCP 47 locale code                                                                    |
| `OBFLocalizedStrings` | Key-value string translations                                                         |
| `OBFStrings`          | Multi-locale string translations                                                      |

### Schemas

Every type above except `ParsedOBZ` and `LoadedBoard` is exported alongside a matching Zod schema with a `Schema` suffix — `OBFBoard` → `OBFBoardSchema`, `OBFManifest` → `OBFManifestSchema`, and so on. Import any of them to validate with `safeParse`/`parse` or to compose into your own schemas:

```ts
import { OBFButtonSchema, OBFManifestSchema } from "@shayc/open-board-format";
```

## Errors

All failures throw plain `Error`. The message identifies what failed, typically with one of these prefixes:

- `Invalid OBF:` — schema validation rejected an OBF board.
- `Invalid OBZ:` — the package was rejected. On read: not a ZIP, missing manifest, or the manifest references a board file not in the archive. On write (`createOBZ`): `rootBoardId` matches no board, two boards share the same id, a board fails validation, two boards map the same media id to conflicting paths, a declared image/sound `path` has no matching resource, or a resource would overwrite a generated entry.
- `Invalid manifest:` — `manifest.json` failed to parse or validate, including a `root` that is not listed in `paths.boards`.
- `Failed to unzip:` — the input passed the ZIP signature check but could not be decompressed (truncated or corrupt archive).

When the root cause is a `JSON.parse` failure, the original error is preserved as `error.cause`. For finer-grained validation, drop one level down and use the Zod schemas directly with `safeParse` — the `issues` array tells you exactly which field failed.

## Security

OBZ archives are untrusted input. This library does not enforce limits on entry size or count, and does not sanitize entry paths — if you write extracted resources to disk, validate paths yourself first to avoid directory traversal. For stronger guarantees against zip-bomb-style payloads, run extraction in a sandboxed context (Web Worker, isolated process).

Found a security issue? Open a private advisory at [github.com/shayc/open-board-format/security/advisories/new](https://github.com/shayc/open-board-format/security/advisories/new).

## Scope

What this library deliberately does not do:

- **No network I/O** — media referenced by `url` or `data_url` is not fetched; resolving external media is up to you.
- **No rendering** — it parses and validates data; drawing boards and playing sounds belong to your app.
- **No extraction limits or path sanitization** — see [Security](#security) before writing archive contents to disk.

## Versioning

Semver. Pre-1.0: minor releases may contain breaking changes — see [CHANGELOG.md](CHANGELOG.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup (Node 22+, Vitest, the changeset workflow).

## Related

- [Open Board Format specification](https://www.openboardformat.org/docs) — the official standard and format documentation.
- [AAC Board AI](https://github.com/shayc/aac-board-ai) — an offline-first AAC web app built on this package, using on-device browser AI for grammar, tone, and translation ([live app](https://aacboard.app)).

## License

[MIT](LICENSE) © Shay Cojocaru
