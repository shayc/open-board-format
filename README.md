# `@shayc/open-board-format`

[![npm version](https://img.shields.io/npm/v/@shayc/open-board-format)](https://www.npmjs.com/package/@shayc/open-board-format)
[![CI](https://github.com/shayc/open-board-format/actions/workflows/ci.yml/badge.svg)](https://github.com/shayc/open-board-format/actions/workflows/ci.yml)

A TypeScript library for parsing, validating, and creating [Open Board Format](https://www.openboardformat.org/) communication boards for AAC applications.

Add Open Board Format support without implementing schemas or archive handling yourself.

## Features

- Load OBF or OBZ files through a single API.
- Create OBZ archives with generated manifests and validated media resources.
- Use exported [Zod](https://zod.dev/) schemas and inferred TypeScript types.
- Preserve unknown fields, including vendor extensions.

## Install

```bash
npm install @shayc/open-board-format
```

Requires `zod ^4.0.0` as a peer dependency.

Works in browsers and Node.js. Browser `File` uploads and Node.js `Buffer` values use the same loading API.

## Quick start

```ts
import { loadBoard } from "@shayc/open-board-format";

const result = await loadBoard(input);
```

`loadBoard` accepts a `File`, `Blob`, `ArrayBuffer`, or `ArrayBufferView` and detects the format from the bytes, not the filename. It returns a TypeScript discriminated union: OBF files contain a board directly, while OBZ files contain an archive whose `rootBoard` is the entry point.

`File` refers to the Web API object, not a filesystem path.

```ts
const board = result.format === "obf" ? result.board : result.archive.rootBoard;
```

## Formats

- **OBF (`.obf`)** is a single JSON communication board.
- **OBZ (`.obz`)** is a ZIP archive containing one or more boards and optional media.

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

Every OBZ archive requires `manifest.json` at its root, even when it contains only one board.

## Examples

### Read an OBZ archive

```ts
import { extractOBZ } from "@shayc/open-board-format";

const archive = await extractOBZ(obzBytes);
```

The returned `ParsedOBZ` contains:

- `manifest`: the validated OBZ manifest.
- `rootBoard`: the board referenced by `manifest.root`.
- `boards`: a `Map` keyed by board ID.
- `resources`: a `Map` containing the raw bytes of every file entry.

`resources` includes the manifest, board files, media, and any other files in the archive.

For untrusted archives, configure [extraction limits](#extraction-limits).

### Create an OBZ archive

Given a board and its media resources:

```ts
import { createOBZ } from "@shayc/open-board-format";

const obz = await createOBZ([board], board.id, resources);
```

`createOBZ` generates the manifest automatically, writes boards to `boards/<encoded-id>.obf`, and uses `rootBoardId` as the archive's entry-point board.

### Validate a board

```ts
import { OBFBoardSchema } from "@shayc/open-board-format";

export const validateBoard = (value: unknown) =>
  OBFBoardSchema.safeParse(value);
```

Every public OBF data model has a matching Zod schema export with a `Schema` suffix. The schemas can also be composed with Zod APIs such as `.extend()` and `.pick()`.

## Validation details

Validation returns a parsed copy of the input. Known fields may be normalized during parsing:

- Numeric IDs become strings.
- Empty optional IDs, URLs, and email addresses become `undefined`.
- Unknown properties are preserved at every loose-object level, with or without an `ext_` prefix.

Structural validation checks:

- URL and email fields are syntax-checked.
- Grid dimensions must be integers from 1 through 100.
- `grid.order` must exactly match the declared row and column counts.
- Positioned buttons must provide `top`, `left`, `width`, and `height`, each between 0 and 1.
- Format versions must match `open-board-*`; they are not restricted to `open-board-0.1`.
- An OBZ manifest root must appear in `paths.boards`.

Validation is not a complete OBF conformance or graph-integrity check. It does not enforce:

- Unique button, image, or sound IDs.
- Resolution of `grid.order`, `image_id`, `sound_id`, or `load_board` references.
- A consistent positioning mode across every button on a board.
- BCP 47 locale syntax, color syntax, MIME correctness, or safe HTML.
- During extraction, the existence of manifest-declared media files or their agreement with board media records.

Add application-specific checks after parsing when those guarantees matter.

## API reference

### High-level API

#### Board data

| Function              | Returns             | Behavior                                                    |
| --------------------- | ------------------- | ----------------------------------------------------------- |
| `parseOBF(json)`      | `OBFBoard`          | Parse JSON and validate a board; strips a leading UTF-8 BOM |
| `validateOBF(value)`  | `OBFBoard`          | Validate and normalize an unknown value                     |
| `stringifyOBF(board)` | `string`            | Serialize as two-space JSON without revalidating            |
| `loadOBF(file)`       | `Promise<OBFBoard>` | Read a `File`, then parse and validate it                   |

#### Archives and format detection

| Function                                     | Returns                | Behavior                                                            |
| -------------------------------------------- | ---------------------- | ------------------------------------------------------------------- |
| `loadBoard(input, options?)`                 | `Promise<LoadedBoard>` | Detect OBF or OBZ from the bytes, then load it                      |
| `loadOBZ(file, options?)`                    | `Promise<ParsedOBZ>`   | `File` convenience wrapper around `extractOBZ`                      |
| `extractOBZ(input, options?)`                | `Promise<ParsedOBZ>`   | Extract and validate the manifest and every manifest-declared board |
| `createOBZ(boards, rootBoardId, resources?)` | `Promise<Blob>`        | Validate and package boards and resources with a generated manifest |
| `parseManifest(json)`                        | `OBFManifest`          | Parse and validate manifest JSON                                    |

Before writing an archive, `createOBZ` checks board IDs, the root board, generated paths, media-path conflicts, and declared media resources. It does not resolve `load_board`, `image_id`, or `sound_id` references.

### Types and schemas

`LoadedBoard` is a discriminated union:

```ts
{ format: "obf", board: OBFBoard }
  | { format: "obz", archive: ParsedOBZ }
```

`ParsedOBZ` provides the validated archive contents:

```ts
interface ParsedOBZ {
  manifest: OBFManifest;
  boards: Map<string, OBFBoard>;
  rootBoard: OBFBoard;
  resources: Map<string, Uint8Array>;
}
```

Main exports include:

- Board, action, media, metadata, and manifest types.
- Matching Zod schemas, including `OBFBoardSchema` and `OBFManifestSchema`.
- Input and archive types: `BinaryInput`, `ParsedOBZ`, and `LoadedBoard`.
- Structured errors through `OBFError` and its related types.

### Errors

High-level APIs report expected parsing, validation, and archive failures as `OBFError`.

Branch on `error.info.code`, not `error.message`.

```ts
import { loadBoard, OBFError } from "@shayc/open-board-format";

try {
  await loadBoard(file);
} catch (error) {
  if (error instanceof OBFError) {
    console.error(error.info.code);
  }

  throw error;
}
```

<details>
<summary><strong>Error codes</strong></summary>

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

</details>

Validation failures expose the underlying `ZodError` as `error.cause` and provide its flat issue list through `error.info.issues`.

`not-json`, `unreadable-zip`, and `zip-failed` expose the underlying parser or ZIP error as `error.cause`. An `internal` error indicates a library invariant failure and should be reported.

Direct schema `.parse()` calls throw `ZodError` rather than `OBFError`.

<details>
<summary><strong>Low-level ZIP utilities</strong></summary>

The following exports are available for advanced archive workflows:

| Function                  | Returns                            | Behavior                                                 |
| ------------------------- | ---------------------------------- | -------------------------------------------------------- |
| `isZip(buffer)`           | `boolean`                          | Check whether an `ArrayBuffer` has a ZIP signature       |
| `zip(entries)`            | `Promise<Uint8Array>`              | Compress a map of paths to `Uint8Array` or `ArrayBuffer` |
| `unzip(buffer, options?)` | `Promise<Map<string, Uint8Array>>` | Extract an `ArrayBuffer` and omit directory markers      |

</details>

## Security

Treat OBZ archives and their contents as untrusted input.

### Extraction limits

```ts
import { extractOBZ } from "@shayc/open-board-format";
import type { BinaryInput } from "@shayc/open-board-format";

export function extractUntrusted(input: BinaryInput) {
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

Extraction limits are optional and disabled by default. Entry and total-size limits are checked against ZIP metadata before inflation, while `maxEntries` caps the number of entries processed.

These limits reduce risk, but they are not strict memory guarantees. ZIP metadata can be dishonest, and stored entries can produce more output than their declared uncompressed size.

Also enforce a limit on the compressed archive size before passing it to this package. Use process isolation or a streaming design when your threat model requires a strict memory boundary.

### Other boundaries

- Archive entry paths are not sanitized. Validate them before writing files to disk to prevent directory traversal.
- `description_html` is not sanitized. Sanitize it before inserting it into the DOM.
- URLs and `data_url` values are validated syntactically but are never fetched.

Found a vulnerability? Email [shayc@outlook.com](mailto:shayc@outlook.com) rather than opening a public issue.

## Runtime

- Pure ESM for Node.js `>=22` and modern browsers; CommonJS is unsupported.
- Browser environments must provide `Blob`, `File`, `TextEncoder`, and `TextDecoder`.
- `fflate` is the only runtime dependency; `zod ^4.0.0` is a peer dependency.
- CI covers Node.js 22, 24, and 26. Browser engines are not currently tested in CI.

## Project

The public API follows semantic versioning. Breaking changes to exported APIs, schemas, or documented behavior ship as major releases.

- **Changelog:** See [CHANGELOG.md](CHANGELOG.md).
- **Support:** [Open an issue](https://github.com/shayc/open-board-format/issues) with a minimal reproduction, package version, runtime, and bundler where applicable.
- **Contributing:** See [CONTRIBUTING.md](CONTRIBUTING.md) for development commands, tests, and the changeset workflow.
- **Specification:** See the [official OBF documentation](https://www.openboardformat.org/docs) or the included [offline mirror](docs/external/open-board-format.md).

## License

[MIT](LICENSE) © Shay Cojocaru
