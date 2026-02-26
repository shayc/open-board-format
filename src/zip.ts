import { unzip as fflateUnzip, zip as fflateZip } from "fflate";

/**
 * First two bytes of every ZIP archive — the ASCII letters `PK`,
 * after Phil Katz, creator of the format.
 *
 * Only the 2-byte prefix is checked intentionally: this keeps the
 * test lightweight and sufficient for distinguishing ZIP from JSON.
 */
const ZIP_MAGIC = [0x50, 0x4b] as const;

/** Balanced speed-vs-size deflate level used by fflate (1–9 scale). */
const COMPRESSION_LEVEL = 6;

/**
 * Decompress a ZIP archive into a map of file paths to raw bytes.
 *
 * @param archive - The raw ZIP bytes to decompress.
 */
export function unzip(archive: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  return new Promise((resolve, reject) => {
    const compressed = new Uint8Array(archive);

    fflateUnzip(compressed, (error, entries) => {
      if (error) {
        reject(new Error(`Failed to unzip: ${error.message ?? String(error)}`));
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
 * pass the output of `unzip` directly or supply raw `ArrayBuffer`s
 * without converting first.
 *
 * @param entries - A map of file paths to their content bytes.
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
        reject(new Error(`Failed to zip: ${error.message ?? String(error)}`));
        return;
      }

      resolve(result);
    });
  });
}

/**
 * Test whether an `ArrayBuffer` begins with the 2-byte ZIP
 * magic prefix (`PK`).
 */
export function isZip(archive: ArrayBuffer): boolean {
  const bytes = new Uint8Array(archive);

  return (
    bytes.length >= ZIP_MAGIC.length &&
    ZIP_MAGIC.every((byte, index) => bytes[index] === byte)
  );
}
