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
  return parseBoard(json, {});
}

/**
 * Where a board came from, reported on its `not-json` and `invalid-board`
 * errors so a failure inside a large package can be found. Internal.
 */
export interface BoardContext {
  /** The board's ID, when known before validation (e.g. its manifest key). */
  boardId?: string;
  /** The board's path inside an `.obz` archive. */
  path?: string;
}

/** {@link parseOBF} that reports `context` on failure. Internal. */
export function parseBoard(json: string, context: BoardContext): OBFBoard {
  let rawBoard: unknown;

  try {
    rawBoard = JSON.parse(stripBom(json)) as unknown;
  } catch (error) {
    throw new OBFError(
      {
        code: "not-json",
        source: "board",
        ...(context.path !== undefined && { path: context.path }),
      },
      { cause: error },
    );
  }

  return validateBoard(rawBoard, context);
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
 *   schema validation. `info.issues` holds the underlying Zod issues, and
 *   `info.boardId` the value's `id` when it is a non-empty string or number.
 */
export function validateOBF(data: unknown): OBFBoard {
  return validateBoard(data, {});
}

/**
 * {@link validateOBF} that reports `context` on failure. Internal. Without a
 * `context.boardId`, the value's own `id` is reported when it is usable.
 */
export function validateBoard(data: unknown, context: BoardContext): OBFBoard {
  const result = OBFBoardSchema.safeParse(data);

  if (result.success) {
    return result.data;
  }

  const boardId = context.boardId ?? rawBoardId(data);

  throw new OBFError(
    {
      code: "invalid-board",
      ...(boardId !== undefined && { boardId }),
      ...(context.path !== undefined && { path: context.path }),
      issues: result.error.issues,
    },
    { cause: result.error },
  );
}

/** The `id` of an unvalidated board, if it is a non-empty string or number. */
function rawBoardId(data: unknown): string | undefined {
  if (typeof data !== "object" || data === null) {
    return undefined;
  }

  const id: unknown = (data as { id?: unknown }).id;
  const text =
    typeof id === "string" || typeof id === "number" ? String(id) : "";

  return text === "" ? undefined : text;
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
