import { parseOBF } from "./obf";
import { extractOBZ } from "./obz";
import type { ParsedOBZ } from "./obz";
import type { OBFBoard } from "./schema";
import { isZip } from "./zip";

/**
 * Result of {@link loadBoard} — a discriminated union over the two file
 * shapes the Open Board Format defines.
 *
 * Switch on `format` to narrow:
 *
 * ```ts
 * const loaded = await loadBoard(file);
 * if (loaded.format === "obz") {
 *   loaded.archive.boards; // ParsedOBZ
 * } else {
 *   loaded.board;          // OBFBoard
 * }
 * ```
 */
export type LoadedBoard =
  | { format: "obz"; archive: ParsedOBZ }
  | { format: "obf"; board: OBFBoard };

/**
 * Detect whether a `File` is a single OBF board or an OBZ package and load it
 * accordingly.
 *
 * The file is read once and its leading bytes are sniffed for the ZIP magic
 * prefix: a ZIP is treated as an `.obz` package, anything else as an `.obf`
 * board. This lets consumers accept either format from a single drag-and-drop
 * or file picker without inspecting the file extension or re-deriving the
 * OBF-vs-OBZ distinction themselves.
 *
 * @param file - A `File` handle pointing to an `.obf` or `.obz` file.
 * @returns A discriminated union tagged by `format`.
 *
 * @throws {Error} If an OBZ archive is malformed or its manifest is missing,
 *   or if an OBF board is malformed or fails schema validation.
 */
export async function loadBoard(file: File): Promise<LoadedBoard> {
  const buffer = await file.arrayBuffer();

  if (isZip(buffer)) {
    return { format: "obz", archive: await extractOBZ(buffer) };
  }

  return { format: "obf", board: parseOBF(new TextDecoder().decode(buffer)) };
}
