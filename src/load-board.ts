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
 *   loaded.archive.rootBoard; // home board of the ParsedOBZ archive
 * } else {
 *   loaded.board;             // OBFBoard
 * }
 * ```
 */
export type LoadedBoard =
  | { format: "obz"; archive: ParsedOBZ }
  | { format: "obf"; board: OBFBoard };

/**
 * Detect whether the input is a single OBF board or an OBZ package and load it
 * accordingly.
 *
 * The input is read once and its leading bytes are sniffed for the ZIP magic
 * prefix: a ZIP is treated as an `.obz` package, anything else as an `.obf`
 * board. This lets consumers accept either format from a single drag-and-drop,
 * file picker, or fetch response without inspecting the file extension or
 * re-deriving the OBF-vs-OBZ distinction themselves.
 *
 * @param input - A `File` handle or `ArrayBuffer` holding `.obf` or `.obz` content.
 * @returns A discriminated union tagged by `format`.
 *
 * @throws {Error} If an OBZ archive is malformed or its manifest is missing,
 *   or if an OBF board is malformed or fails schema validation.
 */
export async function loadBoard(
  input: File | ArrayBuffer,
): Promise<LoadedBoard> {
  const buffer =
    input instanceof ArrayBuffer ? input : await input.arrayBuffer();

  if (isZip(buffer)) {
    return { format: "obz", archive: await extractOBZ(buffer) };
  }

  return { format: "obf", board: parseOBF(new TextDecoder().decode(buffer)) };
}
