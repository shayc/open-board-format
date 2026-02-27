import type { OBFBoard } from "./schema";
import { OBFBoardSchema } from "./schema";

const UTF8_BOM = "\uFEFF";

/** Strip a leading UTF-8 BOM, which some editors silently prepend. */
function stripBom(text: string): string {
  return text.startsWith(UTF8_BOM) ? text.slice(1) : text;
}

/** Build a descriptive parse-failure message, preserving the engine's reason when available. */
function buildParseErrorMessage(error: unknown): string {
  const reason = error instanceof Error ? error.message : "";
  return reason
    ? `Invalid OBF: JSON parse failed — ${reason}`
    : "Invalid OBF: JSON parse failed";
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
 * @throws {Error} If the JSON is malformed or does not conform to the OBF schema.
 */
export function parseOBF(json: string): OBFBoard {
  const sanitized = stripBom(json);

  let rawBoard: unknown;

  try {
    rawBoard = JSON.parse(sanitized) as unknown;
  } catch (error) {
    throw new Error(buildParseErrorMessage(error));
  }

  return validateOBF(rawBoard);
}

/**
 * Read a `File` and parse its contents as a validated OBF board.
 *
 * This relies on the browser `File` API; for Node environments,
 * read the file to a string and pass it to {@link parseOBF} instead.
 *
 * @param file - A `File` handle pointing to an `.obf` file.
 * @returns The validated board object.
 *
 * @throws {Error} If the file content is malformed or fails schema validation.
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
 * @throws {Error} If the value does not conform to the OBF schema.
 */
export function validateOBF(data: unknown): OBFBoard {
  const result = OBFBoardSchema.safeParse(data);

  if (!result.success) {
    throw new Error(`Invalid OBF: ${result.error.message}`);
  }

  return result.data;
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
