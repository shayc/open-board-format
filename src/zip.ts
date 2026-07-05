/**
 * Minimal ZIP helpers over fflate: signature sniffing, unzip, and zip.
 */

import type { UnzipFileInfo } from "fflate";
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
 * Anything this package accepts as binary board data: a raw buffer, any
 * typed-array view into one (including Node's `Buffer`), or a `File`/`Blob`
 * handle.
 */
export type BinaryInput = File | Blob | ArrayBuffer | ArrayBufferView;

/**
 * Normalize any {@link BinaryInput} shape into a plain `ArrayBuffer`.
 *
 * A view is sliced to its own window rather than returning `.buffer`
 * directly, since a `Uint8Array`/`Buffer` may cover only part of a larger,
 * possibly shared, underlying buffer.
 */
export async function toArrayBuffer(input: BinaryInput): Promise<ArrayBuffer> {
  if (input instanceof ArrayBuffer) {
    return input;
  }

  if (ArrayBuffer.isView(input)) {
    return input.buffer.slice(
      input.byteOffset,
      input.byteOffset + input.byteLength,
    ) as ArrayBuffer;
  }

  return input.arrayBuffer();
}

/**
 * Optional caps on declared uncompressed sizes, checked per entry against the
 * archive's ZIP metadata before that entry is inflated. Entries accepted
 * before a later entry trips a limit have already been inflated, but total
 * allocation stays bounded by the caps.
 */
export interface UnzipLimits {
  /** Max declared uncompressed size of any single entry, in bytes. */
  maxEntrySize?: number;
  /** Max sum of declared uncompressed sizes across all entries, in bytes. */
  maxTotalOriginalSize?: number;
  /** Max number of entries, counting directory entries the archive declares. */
  maxEntries?: number;
}

/** Options for {@link unzip} and the OBZ loaders that delegate to it. */
export interface UnzipOptions {
  /** Optional {@link UnzipLimits} enforced during extraction. */
  limits?: UnzipLimits;
}

/**
 * Decompress a ZIP archive into a map of file paths to raw bytes.
 *
 * Directory entries (paths ending in `/`, which some tools write explicitly
 * even though ZIP doesn't require them) are dropped — they carry no content
 * and this map is documented as file paths to bytes.
 *
 * @param archive - The ZIP archive as an `ArrayBuffer`.
 * @param options - Optional {@link UnzipOptions}. `options.limits` is checked
 *   per entry against declared (metadata) sizes before that entry is
 *   inflated. No limits are applied by default.
 * @returns A map of file paths to their decompressed content.
 *
 * @throws {@link OBFError} with `info.code` `"unreadable-zip"` if the archive is
 *   corrupt or cannot be decompressed, or `"archive-too-large"` if a limit in
 *   `options.limits` is exceeded.
 * @throws {@link TypeError} if a limit in `options.limits` is `NaN`.
 */
export function unzip(
  archive: ArrayBuffer,
  options?: UnzipOptions,
): Promise<Map<string, Uint8Array>> {
  for (const key of [
    "maxEntrySize",
    "maxTotalOriginalSize",
    "maxEntries",
  ] as const) {
    const value = options?.limits?.[key];
    if (value !== undefined && Number.isNaN(value)) {
      throw new TypeError(`limits.${key} must not be NaN`);
    }
  }

  return new Promise((resolve, reject) => {
    const compressed = new Uint8Array(archive);
    const { maxEntrySize, maxTotalOriginalSize, maxEntries } =
      options?.limits ?? {};

    let limitError: OBFError | undefined;
    let settled = false;
    let totalDeclared = 0;
    let entryCount = 0;

    const filter = (file: UnzipFileInfo): boolean => {
      if (limitError) {
        return false; // limit tripped: skip the rest cheaply
      }

      entryCount += 1;
      if (maxEntries !== undefined && entryCount > maxEntries) {
        limitError = new OBFError({
          code: "archive-too-large",
          limit: "maxEntries",
          maxEntries,
          entryCount,
          path: file.name,
        });
        return false;
      }

      if (maxEntrySize !== undefined && file.originalSize > maxEntrySize) {
        limitError = new OBFError({
          code: "archive-too-large",
          limit: "maxEntrySize",
          maxBytes: maxEntrySize,
          declaredBytes: file.originalSize,
          path: file.name,
        });
        return false;
      }

      totalDeclared += file.originalSize;
      if (
        maxTotalOriginalSize !== undefined &&
        totalDeclared > maxTotalOriginalSize
      ) {
        limitError = new OBFError({
          code: "archive-too-large",
          limit: "maxTotalOriginalSize",
          maxBytes: maxTotalOriginalSize,
          declaredBytes: totalDeclared,
          path: file.name,
        });
        return false;
      }

      return true;
    };

    const terminate = fflateUnzip(
      compressed,
      options?.limits ? { filter } : {},
      (error, entries) => {
        if (settled) {
          return;
        }
        settled = true;

        if (error) {
          reject(new OBFError({ code: "unreadable-zip" }, { cause: error }));
          return;
        }

        if (limitError) {
          reject(limitError);
          return;
        }

        const pathToBytes = new Map(
          Object.entries(entries).filter(([path]) => !path.endsWith("/")),
        );

        resolve(pathToBytes);
      },
    );

    if (limitError) {
      const error = limitError;
      // Deliberate: this can pre-empt an in-flight entry's own corruption error, surfacing archive-too-large instead of unreadable-zip.
      terminate(); // kill any dispatched async inflate workers
      // Deferred so an archive error fflate queued during its sync pass settles first.
      queueMicrotask(() => {
        if (!settled) {
          settled = true;
          reject(error);
        }
      });
    }
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
      /* v8 ignore start -- defensive: fflate does not error on valid byte input */
      if (error) {
        reject(new OBFError({ code: "zip-failed" }, { cause: error }));
        return;
      }
      /* v8 ignore stop */

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
