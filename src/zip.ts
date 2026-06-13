/**
 * Minimal ZIP helpers over fflate: signature sniffing, unzip, and zip.
 */

import { unzip as fflateUnzip, zip as fflateZip } from "fflate";
import { OBFError } from "./errors";

/**
 * First two bytes of every ZIP archive — the ASCII letters `PK`,
 * after Phil Katz, creator of the format.
 *
 * Only the 2-byte prefix is checked intentionally: this keeps the
 * test lightweight and sufficient for distinguishing ZIP from JSON.
 */
const ZIP_MAGIC = [0x50, 0x4b] as const;

/** Balanced speed-vs-size deflate level, on fflate's 0–9 scale (0 = store). */
const COMPRESSION_LEVEL = 6;

/**
 * Decompress a ZIP archive into a map of file paths to raw bytes.
 *
 * @param archive - The ZIP archive as an `ArrayBuffer`.
 * @returns A map of file paths to their decompressed content.
 *
 * @throws {@link OBFError} with `info.code` `"unreadable-zip"` if the archive is
 *   corrupt or cannot be decompressed.
 */
export function unzip(archive: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  return new Promise((resolve, reject) => {
    const compressed = new Uint8Array(archive);

    fflateUnzip(compressed, (error, entries) => {
      if (error) {
        reject(new OBFError({ code: "unreadable-zip", cause: error }));
        return;
      }

      const pathToBytes = new Map<string, Uint8Array>(Object.entries(entries));

      resolve(pathToBytes);
    });
  });
}

/**
 * Compress a map of file paths and contents into a single ZIP archive.
 *
 * Accepts both `Uint8Array` and `ArrayBuffer` values so callers can
 * pass the output of {@link unzip} directly or supply raw `ArrayBuffer`s
 * without converting first.
 *
 * @param entries - A map of file paths to their content bytes.
 * @returns The compressed archive as a `Uint8Array`.
 *
 * @throws {@link OBFError} with `info.code` `"zip-failed"` if fflate fails to
 *   compress an entry.
 */
export function zip(
  entries: Map<string, Uint8Array | ArrayBuffer>,
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const pathToBytes: Record<string, Uint8Array> = {};

    for (const [path, content] of entries) {
      pathToBytes[path] =
        content instanceof Uint8Array ? content : new Uint8Array(content);
    }

    fflateZip(pathToBytes, { level: COMPRESSION_LEVEL }, (error, result) => {
      if (error) {
        reject(new OBFError({ code: "zip-failed", cause: error }));
        return;
      }

      resolve(result);
    });
  });
}

/**
 * Test whether an `ArrayBuffer` begins with the two-byte ZIP magic
 * prefix (`PK`).
 *
 * @param archive - The buffer to inspect.
 * @returns `true` if the buffer starts with the ZIP signature.
 */
export function isZip(archive: ArrayBuffer): boolean {
  const bytes = new Uint8Array(archive);

  return (
    bytes.length >= ZIP_MAGIC.length &&
    ZIP_MAGIC.every((byte, index) => bytes[index] === byte)
  );
}
