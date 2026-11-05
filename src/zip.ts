/**
 * Minimal ZIP helpers over fflate: signature sniffing, unzip, and zip.
 *
 * Only fflate's synchronous API is used. Its asynchronous API moves large
 * entries into Workers created from `blob:` URLs. A Content Security Policy
 * that does not allow `blob:` workers (`default-src 'self'` is enough) blocks
 * them without an error fflate can see, so the promise never settles. The work
 * is CPU-bound and mostly ran on the calling thread anyway; to keep a page
 * responsive while handling large archives, run this package in a Worker.
 */

import type { UnzipFileInfo, ZipOptions, Zippable } from "fflate";
import { unzipSync, zipSync } from "fflate";
import { OBFError } from "./errors";

/**
 * First two bytes of every ZIP archive — the ASCII letters `PK`,
 * after Phil Katz, creator of the format.
 *
 * Only the 2-byte prefix is checked intentionally: this keeps detection
 * lightweight and is sufficient for distinguishing ZIP from JSON.
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
 * Optional caps on declared uncompressed sizes, checked against ZIP metadata
 * before each entry is inflated. These limits reduce allocation risk but are
 * not strict memory guarantees because archive metadata can be dishonest.
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

  const { maxEntrySize, maxTotalOriginalSize, maxEntries } =
    options?.limits ?? {};

  let limitError: OBFError | undefined;
  let totalDeclared = 0;
  let entryCount = 0;

  // Entries are inflated in archive order, so a corrupt entry before the one
  // that trips a limit reports `unreadable-zip`; entries after it are skipped.
  const filter = (file: UnzipFileInfo): boolean => {
    if (limitError) {
      return false; // Skip the remaining entries cheaply.
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

  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(
      new Uint8Array(archive),
      options?.limits ? { filter } : {},
    );
  } catch (error) {
    return Promise.reject(
      new OBFError({ code: "unreadable-zip" }, { cause: error }),
    );
  }

  if (limitError) {
    return Promise.reject(limitError);
  }

  return Promise.resolve(
    new Map(Object.entries(entries).filter(([path]) => !path.endsWith("/"))),
  );
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
  return zipWithLevels(entries, () => COMPRESSION_LEVEL);
}

/** A deflate level on fflate's 0–9 scale; 0 stores the entry uncompressed. */
export type CompressionLevel = NonNullable<ZipOptions["level"]>;

/**
 * {@link zip} with a deflate level chosen per entry. Internal: `createOBZ`
 * uses it to store media that is already compressed.
 */
export function zipWithLevels(
  entries: Map<string, Uint8Array | ArrayBuffer>,
  levelFor: (path: string) => CompressionLevel,
): Promise<Uint8Array> {
  const zippable: Zippable = {};

  for (const [path, content] of entries) {
    const bytes =
      content instanceof Uint8Array ? content : new Uint8Array(content);
    zippable[path] = [bytes, { level: levelFor(path) }];
  }

  try {
    return Promise.resolve(zipSync(zippable));
  } catch (error) {
    /* v8 ignore next 2 -- defensive: fflate does not error on valid byte input */
    return Promise.reject(
      new OBFError({ code: "zip-failed" }, { cause: error }),
    );
  }
}

/**
 * Test whether a buffer begins with the two-byte ZIP magic prefix (`PK`).
 *
 * @param archive - The bytes to inspect: an `ArrayBuffer` or any
 *   `ArrayBufferView` (e.g. a `Uint8Array` or Node `Buffer`). A view is read
 *   from its own `byteOffset`, not the start of its underlying buffer.
 * @returns `true` if the bytes start with the ZIP signature.
 */
export function isZip(archive: ArrayBuffer | ArrayBufferView): boolean {
  const bytes = ArrayBuffer.isView(archive)
    ? new Uint8Array(archive.buffer, archive.byteOffset, archive.byteLength)
    : new Uint8Array(archive);

  return (
    bytes.length >= ZIP_MAGIC.length &&
    ZIP_MAGIC.every((byte, index) => bytes[index] === byte)
  );
}
