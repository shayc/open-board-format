# `@shayc/open-board-format`

[![npm version](https://img.shields.io/npm/v/@shayc/open-board-format)](https://www.npmjs.com/package/@shayc/open-board-format)
[![CI status](https://github.com/shayc/open-board-format/actions/workflows/ci.yml/badge.svg)](https://github.com/shayc/open-board-format/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/npm/l/@shayc/open-board-format.svg)](LICENSE)

Parse, structurally validate, and create [Open Board Format](https://www.openboardformat.org/) boards (`.obf`) and archives (`.obz`) in TypeScript or JavaScript. Use it to add augmentative and alternative communication (AAC) board import and export without implementing schemas, manifests, or ZIP handling.

`loadBoard` detects either format from its bytes. `createOBZ` validates boards, generates the manifest, and checks declared media. Unknown fields are preserved, and every public OBF model includes an exported [Zod](https://zod.dev/) schema and inferred type.

Pure ESM for Node.js 22+ and modern browsers. This package handles data and archives—it does not render boards, play media, fetch remote resources, or resolve navigation and media references. It powers [AAC Board AI](https://github.com/shayc/aac-board-ai) ([live app](https://aacboard.app)).

**Jump to:** [Choose an API](#choose-an-api) · [Usage](#usage) · [Validation behavior](#validation-behavior) · [API reference](#api-reference) · [Errors](#errors) · [Security](#security)

## Install

```bash
npm install @shayc/open-board-format zod
```

`zod` `^4.4.3` is a required peer dependency. Installing it explicitly keeps setup consistent across package managers and lets this package share your application's Zod instance.

## Quick start

```ts
import { loadBoard } from "@shayc/open-board-format";
import type { BinaryInput, OBFBoard } from "@shayc/open-board-format";

export async function loadRootBoard(input: BinaryInput): Promise<OBFBoard> {
  const loaded = await loadBoard(input);

  return loaded.format === "obf" ? loaded.board : loaded.archive.rootBoard;
}
```

`BinaryInput` is `File | Blob | ArrayBuffer | ArrayBufferView`, so browser files, fetched blobs, typed arrays, and Node.js `Buffer` values work directly. Detection uses the bytes, not the filename.

## Choose an API

| You have                                | Use                                          | Result                 |
| --------------------------------------- | -------------------------------------------- | ---------------------- |
| OBF JSON text                           | `parseOBF(json)`                             | Validated `OBFBoard`   |
| An already-parsed unknown value         | `validateOBF(value)`                         | Validated `OBFBoard`   |
| A known OBF `File`                      | `loadOBF(file)`                              | `Promise<OBFBoard>`    |
| A known OBZ `File`                      | `loadOBZ(file, options?)`                    | `Promise<ParsedOBZ>`   |
| OBZ binary data                         | `extractOBZ(input, options?)`                | `Promise<ParsedOBZ>`   |
| OBF or OBZ binary data                  | `loadBoard(input, options?)`                 | `Promise<LoadedBoard>` |
| Boards and optional media bytes         | `createOBZ(boards, rootBoardId, resources?)` | `Promise<Blob>`        |
| Custom validation or schema composition | Exported `*Schema` values                    | Zod parse result       |

Here, `File` means the Web Platform `File` object, not a filesystem path. For Node.js `Buffer` values or other binary input, use `loadBoard` for either format or `extractOBZ` for known OBZ input.

## Formats at a glance

- OBF (`.obf`) is one JSON communication board.
- OBZ (`.obz`) is a ZIP package containing one or more boards and optional media.

```text
my-board.obz
├── manifest.json
├── boards/
│   └── home.obf
├── images/
│   └── dog.png
└── sounds/
    └── hello.mp3
```

This library requires `manifest.json` at the archive root for every OBZ package, including packages containing one board.

## Usage

### Read an OBZ package

```ts
import { extractOBZ } from "@shayc/open-board-format";
import type { BinaryInput, ParsedOBZ } from "@shayc/open-board-format";

export function extractPackage(input: BinaryInput): Promise<ParsedOBZ> {
  return extractOBZ(input);
}
```

- `rootBoard` is the board referenced by `manifest.root`.
- `boards` is a `Map` keyed by board ID.
- `resources` contains the raw bytes of every file entry, including `manifest.json`, board files, media, and unrelated extra files. Directory entries are omitted.

For untrusted input, configure [extraction limits](#security) appropriate for your application.

### Create an OBZ package

Buttons can reference media by ID. An entry in `images` or `sounds` can declare an archive `path`, and the `resources` map supplies the bytes for that path. `createOBZ` throws when a declared image or sound path has no matching resource.

```ts
import { readFile, writeFile } from "node:fs/promises";
import { createOBZ } from "@shayc/open-board-format";
import type { OBFBoard } from "@shayc/open-board-format";

const board: OBFBoard = {
  format: "open-board-0.1",
  id: "board-1",
  buttons: [{ id: "btn-1", label: "Hello", image_id: "img-1" }],
  grid: { rows: 1, columns: 1, order: [["btn-1"]] },
  images: [{ id: "img-1", path: "images/hello.png" }],
};

const pngBytes = await readFile("hello.png");
const resources = new Map([["images/hello.png", pngBytes]]);

const blob = await createOBZ([board], "board-1", resources);
await writeFile("my-board.obz", new Uint8Array(await blob.arrayBuffer()));
```

The manifest is generated automatically. Boards are written to `boards/<encoded-id>.obf`, and `rootBoardId` selects the entry board. `createOBZ` checks duplicate board IDs, unknown roots, generated-path collisions, conflicting media paths, and missing declared media resources. It does not resolve `load_board` links or button-to-media references.

### Use the schemas directly

```ts
import { OBFBoardSchema } from "@shayc/open-board-format";

export const validateBoard = (value: unknown) =>
  OBFBoardSchema.safeParse(value);
```

Use Zod's `.extend()`, `.pick()`, or other composition APIs to build application-specific contracts from the exported schemas.

## Validation behavior

Validation returns a parsed copy and may normalize known fields:

- Numeric IDs are converted to strings.
- Empty optional IDs, URLs, and email addresses become `undefined`.
- Unknown properties are preserved at every loose-object level, whether or not they use the `ext_` prefix.
- URL and email fields are syntax-checked.
- Grid dimensions must be integers from 1 through 100, and `order` must exactly match `rows` and `columns`.
- A positioned button must provide all four of `top`, `left`, `width`, and `height`, each from 0 through 1.
- Format versions must match `open-board-*`; validation does not restrict them to `open-board-0.1`.
- An OBZ manifest root must appear in `paths.boards`.

Validation is structural, not a complete OBF conformance or graph-integrity check. It does not enforce:

- Unique button, image, or sound IDs.
- That `grid.order`, `image_id`, `sound_id`, or `load_board` references resolve.
- That every button on a board uses the same positioning mode.
- BCP 47 locale syntax, color syntax, MIME correctness, or safe HTML.
- During extraction, that manifest-declared media paths exist or agree with board media entries.

Add application-specific checks after parsing when those guarantees matter.

## API reference

### OBF

| Function              | Returns             | Behavior                                                    |
| --------------------- | ------------------- | ----------------------------------------------------------- |
| `parseOBF(json)`      | `OBFBoard`          | Parse JSON and validate a board; strips a leading UTF-8 BOM |
| `validateOBF(value)`  | `OBFBoard`          | Validate and normalize an unknown value                     |
| `stringifyOBF(board)` | `string`            | Two-space JSON serialization; does not revalidate           |
| `loadOBF(file)`       | `Promise<OBFBoard>` | Read a `File`, then parse and validate it                   |

### OBZ

| Function                                     | Returns              | Behavior                                                            |
| -------------------------------------------- | -------------------- | ------------------------------------------------------------------- |
| `loadOBZ(file, options?)`                    | `Promise<ParsedOBZ>` | `File` convenience wrapper around `extractOBZ`                      |
| `extractOBZ(input, options?)`                | `Promise<ParsedOBZ>` | Extract and validate the manifest and every manifest-declared board |
| `createOBZ(boards, rootBoardId, resources?)` | `Promise<Blob>`      | Validate and package boards/resources with a generated manifest     |
| `parseManifest(json)`                        | `OBFManifest`        | Parse and validate manifest JSON                                    |

`ParsedOBZ` is `{ manifest, boards, rootBoard, resources }`.

### Format detection

| Function                     | Returns                | Behavior                                                                                 |
| ---------------------------- | ---------------------- | ---------------------------------------------------------------------------------------- |
| `loadBoard(input, options?)` | `Promise<LoadedBoard>` | Sniff OBF vs OBZ, then return `{ format: "obf", board }` or `{ format: "obz", archive }` |

### ZIP utilities

| Function                  | Returns                            | Behavior                                                |
| ------------------------- | ---------------------------------- | ------------------------------------------------------- |
| `isZip(buffer)`           | `boolean`                          | Check only for the two-byte `PK` prefix                 |
| `zip(entries)`            | `Promise<Uint8Array>`              | Compress a map of paths to `Uint8Array` / `ArrayBuffer` |
| `unzip(buffer, options?)` | `Promise<Map<string, Uint8Array>>` | Extract an `ArrayBuffer`; omit directory-marker entries |

### Exported types and schemas

- **Boards and actions:** `OBFBoard`, `OBFGrid`, `OBFButton`, `OBFButtonAction`, `OBFSpellingAction`, `OBFSpecialtyAction`, `OBFLoadBoard`
- **Media and metadata:** `OBFMedia`, `OBFImage`, `OBFSound`, `OBFSymbolInfo`, `OBFLicense`, `OBFID`, `OBFFormatVersion`, `OBFLocaleCode`, `OBFLocalizedStrings`, `OBFStrings`, `OBFManifest`
- **Results and input:** `ParsedOBZ`, `LoadedBoard`, `BinaryInput`
- **ZIP options:** `UnzipLimits`, `UnzipOptions`
- **Errors:** `OBFError`, `OBFErrorInfo`, `OBFErrorCode`, `OBFIssue`

Every board/media model type has a matching exported Zod schema with a `Schema` suffix: `OBFBoardSchema`, `OBFButtonSchema`, `OBFManifestSchema`, and so on. `ParsedOBZ`, `LoadedBoard`, binary/ZIP types, and error types do not have matching schemas.

`OBFLocaleCode` is a locale string, typically BCP 47, but its syntax is not validated.

## Errors

Expected parsing, validation, and archive-domain failures from the high-level functions use `OBFError`. Branch on `error.info.code`, not `error.message`.

```ts
import { loadBoard, OBFError } from "@shayc/open-board-format";
import type { BinaryInput } from "@shayc/open-board-format";

export async function openBoard(input: BinaryInput) {
  try {
    return await loadBoard(input);
  } catch (error) {
    if (error instanceof OBFError) {
      console.error(error.info.code, error.info);
    }
    throw error;
  }
}
```

| Area           | `info.code`         | Additional fields                                  |
| -------------- | ------------------- | -------------------------------------------------- |
| Decoding       | `not-json`          | `source`                                           |
| Decoding       | `not-zip`           | —                                                  |
| Decoding       | `unreadable-zip`    | —                                                  |
| Limits         | `archive-too-large` | `limit`, `path`, and fields for the exceeded limit |
| Validation     | `invalid-board`     | `issues`, `boardId?`                               |
| Validation     | `invalid-manifest`  | `issues`                                           |
| OBZ extraction | `missing-manifest`  | —                                                  |
| OBZ extraction | `missing-board`     | `boardId`, `path`                                  |
| OBZ extraction | `board-id-mismatch` | `path`, `declaredId`, `actualId`                   |
| OBZ creation   | `unknown-root`      | `rootBoardId`                                      |
| OBZ creation   | `duplicate-board`   | `boardId`                                          |
| OBZ creation   | `missing-resource`  | `kind`, `mediaId`, `path`                          |
| OBZ creation   | `conflicting-paths` | `kind`, `mediaId`, `paths`                         |
| OBZ creation   | `path-collision`    | `path`                                             |
| OBZ creation   | `zip-failed`        | —                                                  |
| Internal       | `internal`          | `detail`                                           |

- Validation failures put the `ZodError` on `error.cause` and its flat issue list on `error.info.issues`.
- `not-json`, `unreadable-zip`, and `zip-failed` put the underlying parser or fflate error on `error.cause`.
- `internal` indicates a library invariant failure that should be reported.

Schema `.parse()` calls throw `ZodError` directly; `NaN` limits throw `TypeError`, and native I/O, URI encoding, or JSON serialization errors can propagate.

## Security

Treat OBZ archives and their contents as untrusted input.

```ts
import { extractOBZ } from "@shayc/open-board-format";
import type { BinaryInput, ParsedOBZ } from "@shayc/open-board-format";

export function extractUntrusted(input: BinaryInput): Promise<ParsedOBZ> {
  return extractOBZ(input, {
    limits: {
      // Examples only—choose limits appropriate for your application.
      maxEntrySize: 100 * 1024 ** 2, // 100 MiB
      maxTotalOriginalSize: 500 * 1024 ** 2, // 500 MiB
      maxEntries: 10_000,
    },
  });
}
```

The limits are optional and disabled by default. They are checked against sizes declared in ZIP metadata before inflation, and `maxEntries` caps the number of entries processed.

These are not hard memory guarantees for a malicious archive. ZIP metadata can be dishonest, and stored entries can produce more output than their declared uncompressed size. Also enforce an input archive-size limit outside this package; use isolation or a streaming design if your threat model requires a strict memory boundary.

Additional boundaries:

- Archive entry paths are not sanitized. Validate them before writing entries to disk to prevent directory traversal.
- `description_html` is not sanitized. Sanitize it before inserting it into the DOM.
- URLs and `data_url` values are validated syntactically but never fetched.

Found a vulnerability? Email [shayc@outlook.com](mailto:shayc@outlook.com) rather than opening a public issue.

## Runtime and packaging

- Pure ESM; CommonJS is not supported.
- Node.js `>=22`.
- Modern browsers with `Blob`, `File`, `TextEncoder`, and `TextDecoder`.
- Node versions 22, 24, and 26 are covered by CI; browser engines are not currently tested in CI.
- `fflate` is the only runtime dependency. `zod ^4.4.3` is a peer dependency.
- The v1.3.2 full-entry build is 9.6 kB gzip using tsdown 0.22.14, with `fflate` bundled and Zod externalized.
- The package declares `sideEffects: false` and exposes one typed entry point.

## Project

- **Versioning:** The public API follows semver; breaking changes to exported functions, types, schemas, or documented behavior ship as major versions. See [CHANGELOG.md](CHANGELOG.md).
- **Support:** [Open an issue](https://github.com/shayc/open-board-format/issues) with a minimal reproduction, package version, runtime, and bundler where applicable.
- **Contributing:** See [CONTRIBUTING.md](CONTRIBUTING.md) for development commands, tests, and the changeset workflow.
- **Specification:** See the [official documentation](https://www.openboardformat.org/docs) or the included [offline mirror](docs/external/open-board-format.md).

## License

[MIT](LICENSE) © Shay Cojocaru
