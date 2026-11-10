/**
 * Parsing, validation, and serialization for single `.obf` board files.
 */

import { OBFError } from "./errors";
import type { OBFBoard } from "./schema";
import { OBFBoardSchema } from "./schema";

const UTF8_BOM = "\uFEFF";

/** Strip a leading UTF-8 BOM, which some editors silently prepend. */
export function stripBom(text: string): string {
  return text.startsWith(UTF8_BOM) ? text.slice(1) : text;
}

/**
 * Parse a JSON string into a validated OBF board.
 *
 * Strips an optional UTF-8 BOM prefix before parsing and throws a
 * descriptive error if the input is malformed or fails schema validation.
 *
 * @param json - The JSON string to parse.
 * @returns The validated board object.
 *
 * @throws {@link OBFError} with `info.code` `"not-json"` if the JSON is
 *   malformed, or `"invalid-board"` if it fails schema validation.
 */
export function parseOBF(json: string): OBFBoard {
  return parseBoard(json);
}

/**
 * Where a board came from, attached to the errors raised while reading it so
 * a failure inside a package names the board at fault.
 */
export interface BoardLocation {
  /** The board's ID, as declared by the manifest or the board itself. */
  boardId?: string;
  /** The board's path within its archive. */
  path?: string;
}

/**
 * {@link parseOBF} with a {@link BoardLocation} for its errors. Internal: the
 * public entry points are {@link parseOBF} and `extractOBZ`.
 */
export function parseBoard(json: string, location?: BoardLocation): OBFBoard {
  let rawBoard: unknown;

  try {
    rawBoard = JSON.parse(stripBom(json)) as unknown;
  } catch (error) {
    throw new OBFError(
      { code: "not-json", source: "board", ...location },
      { cause: error },
    );
  }

  return validateBoard(rawBoard, location);
}

/** {@link validateOBF} with a {@link BoardLocation} for its error. Internal. */
export function validateBoard(
  data: unknown,
  location?: BoardLocation,
): OBFBoard {
  const result = OBFBoardSchema.safeParse(data);

  if (!result.success) {
    throw new OBFError(
      { code: "invalid-board", ...location, issues: result.error.issues },
      { cause: result.error },
    );
  }

  return result.data;
}

/**
 * Read a `File` and parse its contents as a validated OBF board.
 *
 * For a `Blob`, `ArrayBuffer`, or typed-array input, use `loadBoard` instead.
 *
 * @param file - A `File` handle pointing to an `.obf` file.
 * @returns The validated board object.
 *
 * @throws {@link OBFError} with `info.code` `"not-json"` if the file content is
 *   malformed, or `"invalid-board"` if it fails schema validation.
 */
export async function loadOBF(file: File): Promise<OBFBoard> {
  const json = await file.text();
  return parseOBF(json);
}

/**
 * Validate an unknown value against the OBF board schema.
 *
 * @param data - The value to validate.
 * @returns The validated board object.
 *
 * @throws {@link OBFError} with `info.code` `"invalid-board"` if the value fails
 *   schema validation. `info.issues` holds the underlying Zod issues.
 */
export function validateOBF(data: unknown): OBFBoard {
  return validateBoard(data);
}

/**
 * Stringify an OBF board to a pretty-printed JSON string.
 *
 * @param board - The board to stringify.
 * @returns A JSON string with two-space indentation.
 */
export function stringifyOBF(board: OBFBoard): string {
  return JSON.stringify(board, null, 2);
}
