# `@shayc/open-board-format`

[![npm version](https://img.shields.io/npm/v/@shayc/open-board-format)](https://www.npmjs.com/package/@shayc/open-board-format)
[![CI](https://github.com/shayc/open-board-format/actions/workflows/ci.yml/badge.svg)](https://github.com/shayc/open-board-format/actions/workflows/ci.yml)

A TypeScript library for parsing, validating, and creating [Open Board Format](https://www.openboardformat.org/) communication boards for AAC applications.

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

Works in browsers and Node.js.

## Quick start

```ts
import { loadBoard } from "@shayc/open-board-format";

const result = await loadBoard(input);
const board = result.format === "obf" ? result.board : result.archive.rootBoard;
```

`loadBoard` accepts a `File`, `Blob`, `ArrayBuffer`, or `ArrayBufferView` and detects OBF or OBZ from the bytes, not the filename. In Node.js, pass the file's bytes: `loadBoard(await readFile("board.obz"))`.

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

## Examples

### Read an OBZ archive

```ts
import { extractOBZ } from "@shayc/open-board-format";

const archive = await extractOBZ(obzBytes);
```

It returns a [`ParsedOBZ`](#types-and-schemas) with the validated manifest, every board, the root board, and the raw bytes of every archive entry. For untrusted archives, configure [extraction limits](#extraction-limits).

### Create an OBZ archive

Given a board and its media resources:

```ts
import { createOBZ } from "@shayc/open-board-format";

const obz = await createOBZ([board], board.id, resources);
```

`createOBZ` generates the manifest automatically, writes boards to `boards/<encoded-id>.obf`, and uses `rootBoardId` as the archive's entry-point board. A `load_board` whose `id` names one of the boards gets its `path` set to that file; links without an `id` are left unchanged. Media in already-compressed formats, such as PNG, JPEG, and MP3, is stored without recompression.

### Validate a board

```ts
import { validateOBF } from "@shayc/open-board-format";

const board = validateOBF(value);
```

`validateOBF` returns a [normalized](#validation-details) copy of the board or throws an `OBFError`. Every data model also has a matching `…Schema` export, such as `OBFBoardSchema`, for composing your own checks with Zod.

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

Before writing an archive, `createOBZ` checks board IDs, the root board, generated paths, media-path conflicts, and declared media resources. Apart from pointing `load_board` links at packaged boards, it does not resolve `load_board`, `image_id`, or `sound_id` references.

### Types and schemas

```ts
type LoadedBoard =
  | { format: "obf"; board: OBFBoard }
  | { format: "obz"; archive: ParsedOBZ };

interface ParsedOBZ {
  manifest: OBFManifest;
  boards: Map<string, OBFBoard>; // keyed by board ID
  rootBoard: OBFBoard; // the board at manifest.root
  resources: Map<string, Uint8Array>; // every archive entry, keyed by path
}
```

Every data model exports both a type and a Zod schema, such as `OBFBoard` and `OBFBoardSchema`. Other exported types are `BinaryInput`, `UnzipOptions`, `UnzipLimits`, `OBFErrorInfo`, `OBFErrorCode`, and `OBFIssue`.

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
| Decoding       | `not-json`          | `source`, `path?`                                  |
| Decoding       | `not-zip`           | —                                                  |
| Decoding       | `unreadable-zip`    | —                                                  |
| Limits         | `archive-too-large` | `limit`, `path`, and fields for the exceeded limit |
| Validation     | `invalid-board`     | `issues`, `boardId?`, `path?`                      |
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

Validation failures expose the underlying `ZodError` as `error.cause` and provide its flat issue list through `error.info.issues`. When a board inside an OBZ fails, `boardId` and `path` say which one.

`not-json`, `unreadable-zip`, and `zip-failed` expose the underlying parser or ZIP error as `error.cause`. An `internal` error indicates a library invariant failure and should be reported.

Direct schema `.parse()` calls throw `ZodError` rather than `OBFError`.

### Low-level ZIP utilities

| Function                  | Returns                            | Behavior                                                   |
| ------------------------- | ---------------------------------- | ---------------------------------------------------------- |
| `isZip(buffer)`           | `boolean`                          | Check whether an `ArrayBuffer` or view has a ZIP signature |
| `zip(entries)`            | `Promise<Uint8Array>`              | Compress a map of paths to `Uint8Array` or `ArrayBuffer`   |
| `unzip(buffer, options?)` | `Promise<Map<string, Uint8Array>>` | Extract an `ArrayBuffer` and omit directory markers        |

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
- `fflate` is the only runtime dependency.
- No Workers are created, so the package works under a strict Content Security Policy. ZIP work runs on the calling thread; to keep a page responsive while handling large archives, call the package from your own Worker.
- CI covers Node.js 22, 24, and 26. Browser engines are not currently tested in CI.

## Project

The public API follows semantic versioning. Breaking changes to exported APIs, schemas, or documented behavior ship as major releases.

- **Changelog:** See [CHANGELOG.md](CHANGELOG.md).
- **Support:** [Open an issue](https://github.com/shayc/open-board-format/issues) with a minimal reproduction, package version, runtime, and bundler where applicable.
- **Contributing:** See [CONTRIBUTING.md](CONTRIBUTING.md) for development commands, tests, and the changeset workflow.
- **Specification:** See the [official OBF documentation](https://www.openboardformat.org/docs) or the included [offline mirror](docs/external/open-board-format.md).

## License

[MIT](LICENSE) © Shay Cojocaru
