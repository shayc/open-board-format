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
 * Handles an optional UTF-8 BOM prefix and throws a descriptive
 * error if the input is malformed or fails schema validation.
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
 * Read a `File` handle and parse its contents as an OBF board.
 *
 * This relies on the browser `File` API; for Node environments,
 * read the file to a string and pass it to {@link parseOBF} instead.
 */
export async function loadOBF(file: File): Promise<OBFBoard> {
  const json = await file.text();
  return parseOBF(json);
}

/**
 * Validate an unknown value against the OBF board schema.
 *
 * @throws {Error} If the value does not conform to the schema.
 */
export function validateOBF(data: unknown): OBFBoard {
  const result = OBFBoardSchema.safeParse(data);

  if (!result.success) {
    throw new Error(`Invalid OBF: ${result.error.message}`);
  }

  return result.data;
}

/**
 * Serialize an OBF board to a pretty-printed JSON string.
 */
export function stringifyOBF(board: OBFBoard): string {
  return JSON.stringify(board, null, 2);
}
