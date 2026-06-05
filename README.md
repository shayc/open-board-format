# `@shayc/open-board-format`

A TypeScript toolkit for [Open Board Format](https://www.openboardformat.org/) — the open standard for Augmentative and Alternative Communication (AAC) boards. Parse, validate, and create OBF boards and OBZ packages, all backed by [Zod](https://zod.dev/) schemas with full TypeScript types inferred.

[![npm version](https://img.shields.io/npm/v/@shayc/open-board-format)](https://www.npmjs.com/package/@shayc/open-board-format)
[![CI](https://github.com/shayc/open-board-format/actions/workflows/ci.yml/badge.svg)](https://github.com/shayc/open-board-format/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/npm/l/@shayc/open-board-format.svg)](LICENSE)

OBF (`.obf`) is a JSON file describing a single communication board — buttons, images, sounds, grid layout, metadata. OBZ (`.obz`) is a ZIP archive bundling one or more `.obf` boards with their media and a `manifest.json`.

## Install

```bash
npm install @shayc/open-board-format
```

## Quick start

```ts
import { parseOBF } from "@shayc/open-board-format";

const board = parseOBF(jsonString);
console.log(board.id, board.buttons.length);
```

`parseOBF` throws on invalid input; the returned value is a fully typed `OBFBoard`. For other input shapes (already-parsed object, browser `File`, OBZ archive), see [Overview](#overview).

## Overview

Two file types; pick the entry point by what you have:

- **OBF** is a single board (a JSON object). Use `parseOBF` for a JSON string, `validateOBF` for an already-parsed object, `loadOBF` for a browser `File`. `stringifyOBF` serializes back out.
- **OBZ** is a package of boards plus media (a ZIP archive). Use `loadOBZ` for a `File`, `extractOBZ` for an `ArrayBuffer`, `createOBZ` to build a new one.

If you accept a `File` and don't know which of the two it is, use `loadBoard` — it sniffs the bytes and returns a `{ format, ... }` union so you don't have to inspect the extension yourself.

Every OBF type ships with a matching `*Schema` Zod schema (e.g. `OBFBoardSchema`, `OBFManifestSchema`), so you can validate inline with `safeParse` or wire the schema straight into an API contract — the TypeScript types are inferred from those schemas.

Validation preserves unknown fields rather than stripping them, so vendor extensions allowed by the OBF spec survive a `parseOBF` → `stringifyOBF` round trip.

## Requirements

- **Module format:** ESM only.
- **Runtime:** browser or Node 22+ — works against `File`, `ArrayBuffer`, and `Blob`.

## Examples

### Extract an OBZ package

```ts
import { loadOBZ, extractOBZ } from "@shayc/open-board-format";

// From a File (e.g. drag-and-drop)
const { manifest, boards, resources } = await loadOBZ(file);

// Or from an ArrayBuffer (e.g. fetch response)
const parsed = await extractOBZ(buffer);

const homeBoard = parsed.boards.get("1");
const imageBytes = parsed.resources.get("images/logo.png");
```

### Create an OBZ package

```ts
import { createOBZ } from "@shayc/open-board-format";
import type { OBFBoard } from "@shayc/open-board-format";

const boards: OBFBoard[] = [
  {
    format: "open-board-0.1",
    id: "board-1",
    buttons: [{ id: "btn-1", label: "Hello" }],
    grid: { rows: 1, columns: 1, order: [["btn-1"]] },
  },
];

const pngBytes = new Uint8Array(/* ... */);
const resources = new Map([["images/logo.png", pngBytes]]);
const blob = await createOBZ(boards, "board-1", resources);
```

### Load either format from one input

```ts
import { loadBoard } from "@shayc/open-board-format";

// `file` came from a drag-and-drop or <input type="file"> — could be .obf or .obz
const loaded = await loadBoard(file);

if (loaded.format === "obz") {
  const homeBoard = loaded.archive.boards.get("1");
} else {
  const board = loaded.board;
}
```

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

### Either format

| Function          | Description                                                                |
| ----------------- | -------------------------------------------------------------------------- |
| `loadBoard(file)` | Detect OBF vs OBZ from a `File` and load it; returns a `LoadedBoard` union |

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
| `OBFSound`            | A sound resource (extends `OBFMedia`)                                                 |
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
- `Invalid OBZ:` — the package was rejected. On read: not a ZIP, missing manifest, or the manifest references a board file not in the archive. On write (`createOBZ`): `rootBoardId` matches no board, a board fails validation, two boards map the same media id to conflicting paths, a declared image/sound `path` has no matching resource, or a resource would overwrite a generated entry.
- `Invalid manifest:` — `manifest.json` failed to parse or validate.

When the root cause is a `JSON.parse` failure, the original error is preserved as `error.cause`. For finer-grained validation, drop one level down and use the Zod schemas directly with `safeParse` — the `issues` array tells you exactly which field failed.

## Security

OBZ archives are untrusted input. This library does not enforce limits on entry size or count, and does not sanitize entry paths — if you write extracted resources to disk, validate paths yourself first to avoid directory traversal. For stronger guarantees against zip-bomb-style payloads, run extraction in a sandboxed context (Web Worker, isolated process).

Found a security issue? Open a private advisory at [github.com/shayc/open-board-format/security/advisories/new](https://github.com/shayc/open-board-format/security/advisories/new).

## Versioning

Semver; see [CHANGELOG.md](CHANGELOG.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup (Node 22+, Vitest, the changeset workflow).

## Related

- [Open Board Format specification](https://www.openboardformat.org/docs) — the official standard and format documentation.
- [AAC Board AI](https://github.com/shayc/aac-board-ai) — an offline-first AAC web app built on this package, using on-device browser AI for grammar, tone, and translation ([live app](https://aacboard.app)).

## License

[MIT](LICENSE) © Shay Cojocaru
