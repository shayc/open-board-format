# open-board-format

A type-safe toolkit to parse, validate, and create Open Board Format (OBF/OBZ) files for Augmentative and Alternative Communication (AAC) applications.

## What is Open Board Format?

[Open Board Format](https://www.openboardformat.org/) is an open standard for representing AAC communication boards — grids of labeled buttons that a person taps to communicate. It defines two file types:

- **OBF** (`.obf`) — A JSON file describing a single communication board: its buttons, images, sounds, grid layout, and metadata.
- **OBZ** (`.obz`) — A ZIP archive containing one or more `.obf` boards along with their images, sounds, and a `manifest.json` that ties everything together.

The format enables users and practitioners to **move boards between AAC apps** without starting from scratch — a common pain point in the AAC community.

## Features

- **Parse & validate** OBF boards from JSON strings, objects, or `File` handles
- **Create & extract** OBZ packages (ZIP archives with boards, images, and sounds)
- **[Zod](https://zod.dev/) schemas** for every OBF type — use them for runtime validation, form building, or API contracts
- **Full TypeScript types** inferred from schemas — no separate type maintenance
- **Spec-compliant coercion** — numeric IDs are coerced to strings, empty strings become `undefined`, and UTF-8 BOM is handled automatically
- **Tree-shakeable** ESM build with no side effects (`"sideEffects": false` in `package.json`)

## Install

```bash
npm install open-board-format
```

> Zero peer dependencies. Powered by [zod](https://zod.dev/) for validation and [fflate](https://github.com/101arrowz/fflate) for ZIP — both listed as standard `dependencies` in `package.json`, so your bundler deduplicates them normally.

## Quick start

All examples below assume the following imports:

```ts
import {
  parseOBF,
  validateOBF,
  stringifyOBF,
  loadOBF,
  extractOBZ,
  loadOBZ,
  createOBZ,
  OBFBoardSchema,
} from "open-board-format";
import type { OBFBoard, ParsedOBZ } from "open-board-format";
```

### Parse a single board (OBF)

```ts
// Parse from a JSON string
const board = parseOBF(jsonString);

console.log(board.name); // "My Board"
console.log(board.buttons[0]); // { id: "1", label: "hello", image_id: "img1" }

// Validate an unknown object (throws on failure)
const validated = validateOBF(untrustedData);

// Serialize back to a formatted JSON string
const json = stringifyOBF(board);

// Load from a File object (e.g. browser file-input)
const fromFile = await loadOBF(file);
```

### Extract an OBZ package

```ts
// From a File (e.g. drag-and-drop)
const { manifest, boards, files }: ParsedOBZ = await loadOBZ(file);

// Or from an ArrayBuffer (e.g. fetch response)
const parsed = await extractOBZ(buffer);

// Access boards by ID
const rootPath = parsed.manifest.root; // "boards/1.obf"
const homeBoard = parsed.boards.get("1");

// Access raw files (images, sounds, etc.)
const imageBytes = parsed.files.get("images/logo.png");
```

`ParsedOBZ` has the following shape:

```ts
interface ParsedOBZ {
  manifest: OBFManifest; // Validated manifest.json
  boards: Map<string, OBFBoard>; // Board ID → parsed board
  files: Map<string, Uint8Array>; // File path → raw bytes
}
```

### Create an OBZ package

```ts
const boards: OBFBoard[] = [
  {
    format: "open-board-0.1",
    id: "board-1",
    buttons: [{ id: "btn-1", label: "Hello" }],
    grid: { rows: 1, columns: 1, order: [["btn-1"]] },
  },
];

// Optional: include image/sound resources
const resources = new Map([["images/logo.png", pngBytes]]);

const blob = await createOBZ(boards, "board-1", resources);
// blob is a Blob you can download, upload, or store
```

### Use Zod schemas directly

Every OBF type is exported as both a **Zod schema** (for runtime validation) and a **TypeScript type** (for static analysis):

```ts
// Safe parsing (returns { success, data, error })
const result = OBFBoardSchema.safeParse(data);

if (result.success) {
  console.log(result.data.buttons);
} else {
  console.error(result.error.issues);
}
```

## API reference

### OBF functions

| Signature                                | Description                                                    |
| ---------------------------------------- | -------------------------------------------------------------- |
| `parseOBF(json: string): OBFBoard`       | Parse a JSON string into a validated board. Handles UTF-8 BOM. |
| `validateOBF(data: unknown): OBFBoard`   | Validate an unknown value against the board schema.            |
| `stringifyOBF(board: OBFBoard): string`  | Serialize a board to a formatted JSON string.                  |
| `loadOBF(file: File): Promise<OBFBoard>` | Read and parse a board from a `File` object.                   |

### OBZ functions

| Signature                                                                                                | Description                                               |
| -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `extractOBZ(buffer: ArrayBuffer): Promise<ParsedOBZ>`                                                    | Extract boards and files from an OBZ archive buffer.      |
| `loadOBZ(file: File): Promise<ParsedOBZ>`                                                                | Read and extract an OBZ package from a `File` object.     |
| `createOBZ(boards: OBFBoard[], rootBoardId: string, resources?: Map<string, Uint8Array>): Promise<Blob>` | Create an OBZ archive from boards and optional resources. |
| `parseManifest(json: string): OBFManifest`                                                               | Parse and validate a `manifest.json` string.              |

### ZIP utilities

| Signature                                                      | Description                                             |
| -------------------------------------------------------------- | ------------------------------------------------------- |
| `zip(files): Promise<Uint8Array>`                              | Create a ZIP archive from a map of paths to content.    |
| `unzip(buffer: ArrayBuffer): Promise<Map<string, Uint8Array>>` | Extract files from a ZIP archive.                       |
| `isZip(buffer: ArrayBuffer): boolean`                          | Check whether a buffer starts with the ZIP magic bytes. |

### Schemas & types

<details>
<summary><strong>All exported schemas & types</strong></summary>

| Schema                      | Type                  | Description                                     |
| --------------------------- | --------------------- | ----------------------------------------------- |
| `OBFBoardSchema`            | `OBFBoard`            | Root board object                               |
| `OBFButtonSchema`           | `OBFButton`           | Button with label, action, colors, positioning  |
| `OBFGridSchema`             | `OBFGrid`             | Grid layout (rows, columns, order)              |
| `OBFImageSchema`            | `OBFImage`            | Image resource with dimensions and symbol info  |
| `OBFSoundSchema`            | `OBFSound`            | Sound resource                                  |
| `OBFMediaSchema`            | `OBFMedia`            | Common media base (shared by images & sounds)   |
| `OBFLicenseSchema`          | `OBFLicense`          | Licensing and attribution                       |
| `OBFManifestSchema`         | `OBFManifest`         | OBZ manifest (`manifest.json`)                  |
| `OBFLoadBoardSchema`        | `OBFLoadBoard`        | Reference to another board                      |
| `OBFButtonActionSchema`     | `OBFButtonAction`     | Spelling or specialty action                    |
| `OBFSpellingActionSchema`   | `OBFSpellingAction`   | Spelling action (`+a`, `+oo`, …)                |
| `OBFSpecialtyActionSchema`  | `OBFSpecialtyAction`  | Specialty action (`:clear`, `:home`, …)         |
| `OBFIDSchema`               | `OBFID`               | Unique identifier (string, coerced from number) |
| `OBFFormatVersionSchema`    | `OBFFormatVersion`    | Format version string                           |
| `OBFLocaleCodeSchema`       | `OBFLocaleCode`       | BCP 47 locale code                              |
| `OBFLocalizedStringsSchema` | `OBFLocalizedStrings` | Key-value string translations                   |
| `OBFStringsSchema`          | `OBFStrings`          | Multi-locale string map                         |
| `OBFSymbolInfoSchema`       | `OBFSymbolInfo`       | Proprietary symbol set reference                |

</details>

## Spec notes

This library targets the **`open-board-0.1`** format version. Key behaviors:

- **ID coercion** — Numeric IDs (common in real-world files) are automatically coerced to strings, per the spec's parsing guidelines.
- **Media resolution order** — When an image or sound has multiple references, resolve in order: `data` → `path` → `url` → `symbol`.
- **Grid validation** — The `order` array must have exactly `rows` sub-arrays, each with exactly `columns` entries.
- **Extensions** — Properties prefixed with `ext_` are passed through. The schemas rely on Zod's default object parsing behavior, which preserves unrecognized keys — so custom `ext_` fields survive parsing and serialization without throwing validation errors.

## Development

```bash
npm install       # Install dependencies
npm test          # Run tests (vitest)
npm run build     # Build for production (tsdown)
npm run typecheck # Type-check without emitting
```

## Related

- [Open Board Format specification](https://www.openboardformat.org/docs) — Official standard and format documentation

## License

[MIT](LICENSE) © Shay Cojocaru
