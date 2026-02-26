# open-board-format

[![npm version](https://img.shields.io/npm/v/open-board-format)](https://www.npmjs.com/package/open-board-format)
[![license](https://img.shields.io/npm/l/open-board-format)](LICENSE)

A type-safe toolkit to parse, validate, and create Open Board Format (OBF/OBZ) files for Augmentative and Alternative Communication (AAC) applications.

[Open Board Format](https://www.openboardformat.org/) is an open standard for representing AAC communication boards. It defines two file types:

- **OBF** (`.obf`) — A JSON file describing a single communication board (buttons, images, sounds, grid layout, metadata).
- **OBZ** (`.obz`) — A ZIP archive containing one or more `.obf` boards along with their associated media and a `manifest.json`.

## Features

- **Parse & Validate:** Parse and validate OBF boards from JSON strings, objects, or `File` handles.
- **Create & Extract:** Serialize boards to JSON, and create or extract OBZ packages (ZIP archives with boards, images, and sounds).
- **Zod Schemas:** Every OBF type has a corresponding [Zod](https://zod.dev/) schema for runtime validation or API contracts, with full TypeScript types inferred directly.

## Install

```bash
npm install open-board-format
```

## Quick start

### Parse a single board (OBF)

```ts
import { parseOBF, validateOBF, loadOBF } from "open-board-format";

// Parse from a JSON string
const board = parseOBF(jsonString);
console.log(board.name); // "My Board"

// Validate an unknown object (throws on failure)
const validated = validateOBF(untrustedData);

// Load from a browser File object
const fromFile = await loadOBF(file);
```

### Extract an OBZ package

```ts
import { loadOBZ, extractOBZ } from "open-board-format";

// From a File (e.g. drag-and-drop)
const { manifest, boards, resources } = await loadOBZ(file);

// Or from an ArrayBuffer (e.g. fetch response)
const parsed = await extractOBZ(buffer);

// Access boards and resources
const homeBoard = parsed.boards.get("1");
const imageBytes = parsed.resources.get("images/logo.png");
```

### Create an OBZ package

```ts
import { createOBZ } from "open-board-format";
import type { OBFBoard } from "open-board-format";

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

### Use Zod schemas directly

```ts
import { OBFBoardSchema } from "open-board-format";

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

| Function                                | Description                                                   |
| --------------------------------------- | ------------------------------------------------------------- |
| `loadOBZ(file)`                         | Load an OBZ package from a browser `File`                     |
| `extractOBZ(archive)`                   | Extract boards, manifest, and resources from an `ArrayBuffer` |
| `createOBZ(boards, rootId, resources?)` | Create an OBZ package as a `Blob`                             |
| `parseManifest(json)`                   | Parse a `manifest.json` string into a validated `OBFManifest` |

### Utilities

| Function        | Description                                              |
| --------------- | -------------------------------------------------------- |
| `isZip(archive)` | Check if an `ArrayBuffer` starts with a ZIP magic number |
| `zip(entries)`   | Create a ZIP from a map of paths to buffers              |
| `unzip(archive)` | Extract a ZIP into a map of paths to `Uint8Array`        |

### Types

| Type                  | Description                                                             |
| --------------------- | ----------------------------------------------------------------------- |
| `OBFBoard`            | A single communication board                                            |
| `OBFGrid`             | Grid layout (rows, columns, order)                                      |
| `OBFButton`           | A button on the board                                                   |
| `OBFButtonAction`     | Button action (spelling or specialty)                                   |
| `OBFSpellingAction`   | Spelling action (e.g., `+s`)                                            |
| `OBFSpecialtyAction`  | Specialty action (e.g., `:clear`)                                       |
| `OBFLoadBoard`        | Reference to load another board                                         |
| `OBFMedia`            | Common media properties (base for `OBFImage` and `OBFSound`)            |
| `OBFImage`            | An image resource (extends `OBFMedia`)                                  |
| `OBFSound`            | A sound resource (extends `OBFMedia`)                                   |
| `OBFSymbolInfo`       | Symbol set reference                                                    |
| `OBFManifest`         | OBZ package manifest                                                    |
| `ParsedOBZ`           | Return type of `extractOBZ` / `loadOBZ` — `{ manifest, boards, resources }` |
| `OBFID`               | Unique identifier (string, coerced from number)                         |
| `OBFFormatVersion`    | Format version string (e.g., `open-board-0.1`)                          |
| `OBFLicense`          | Licensing information                                                   |
| `OBFLocaleCode`       | BCP 47 locale code                                                      |
| `OBFLocalizedStrings` | Key-value string translations                                           |
| `OBFStrings`          | Multi-locale string translations                                        |

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
