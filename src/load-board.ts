/**
 * Format-agnostic loading of `.obf` boards and `.obz` packages.
 */

import { parseOBF } from "./obf";
import type { ParsedOBZ } from "./obz";
import { extractOBZ } from "./obz";
import type { OBFBoard } from "./schema";
import type { BinaryInput, UnzipLimits } from "./zip";
import { isZip, toArrayBuffer } from "./zip";

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
 * Input that begins with the ZIP magic prefix is treated as an `.obz` package;
 * anything else is parsed as an `.obf` board. The input is read once, so
 * consumers can accept either format from a single drag-and-drop, file picker,
 * or fetch response without inspecting the file extension or re-deriving the
 * OBF-vs-OBZ distinction themselves.
 *
 * @param input - A `File`, `Blob`, `ArrayBuffer`, or `ArrayBufferView`
 *   (e.g. a Node `Buffer`) holding `.obf` or `.obz` content.
 * @param limits - Optional {@link UnzipLimits} on declared uncompressed sizes.
 *   Applies only when the input is an OBZ archive; ignored for `.obf` JSON.
 * @returns A discriminated union tagged by `format`.
 *
 * @throws {@link OBFError} — the OBZ failures of {@link extractOBZ} when the
 *   input is an archive, or the OBF failures of {@link parseOBF} otherwise.
 *   Branch on `error.info.code`.
 */
export async function loadBoard(
  input: BinaryInput,
  limits?: UnzipLimits,
): Promise<LoadedBoard> {
  const buffer = await toArrayBuffer(input);

  if (isZip(buffer)) {
    return { format: "obz", archive: await extractOBZ(buffer, limits) };
  }

  return { format: "obf", board: parseOBF(new TextDecoder().decode(buffer)) };
}
