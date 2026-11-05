/**
 * Creation and extraction of `.obz` board packages.
 */

import { OBFError } from "./errors";
import { parseBoard, stripBom, validateBoard } from "./obf";
import type { OBFBoard, OBFManifest } from "./schema";
import { OBFManifestSchema } from "./schema";
import type { BinaryInput, CompressionLevel, UnzipOptions } from "./zip";
import { isZip, toArrayBuffer, unzip, zipWithLevels } from "./zip";

/**
 * Media formats that are already compressed. Deflate saves about 1% on them
 * (1.4% on the PNGs in a 70 MB real board set) at most of the archive's
 * compression time, so `createOBZ` stores them as-is.
 */
const PRECOMPRESSED_EXTENSION =
  /\.(?:png|jpe?g|gif|webp|avif|mp3|m4a|aac|ogg|oga|opus|mp4|webm)$/i;

/** Deflate level for everything else, on fflate's 0–9 scale. */
const DEFLATE_LEVEL = 6;

function compressionLevelFor(path: string): CompressionLevel {
  return PRECOMPRESSED_EXTENSION.test(path) ? 0 : DEFLATE_LEVEL;
}

/**
 * Fully extracted contents of an `.obz` archive.
 */
export interface ParsedOBZ {
  /** The package's table of contents. */
  manifest: OBFManifest;
  /** Validated board objects keyed by board ID. */
  boards: Map<string, OBFBoard>;
  /**
   * The package's entry-point board — the one `manifest.root` points at,
   * already resolved. Same object as `boards.get(rootBoard.id)`.
   */
  rootBoard: OBFBoard;
  /**
   * Raw bytes for every entry in the archive, keyed by archive path —
   * including `manifest.json` and the `.obf` boards as well as media
   * such as images and sounds.
   */
  resources: Map<string, Uint8Array>;
}

/**
 * Read a `File` and extract its contents as a parsed OBZ package.
 *
 * A thin convenience wrapper — {@link extractOBZ} accepts a `File` directly,
 * so this exists only for the naming symmetry with {@link loadOBF}.
 *
 * @param file - A `File` handle pointing to an `.obz` archive.
 * @param options - Optional {@link UnzipOptions} on declared uncompressed sizes.
 * @returns The parsed manifest, boards, root board, and binary resources.
 *
 * @throws {@link OBFError} — the same failures as {@link extractOBZ}, which
 *   this delegates to.
 * @throws {@link TypeError} if a limit in `options.limits` is `NaN`.
 */
export async function loadOBZ(
  file: File,
  options?: UnzipOptions,
): Promise<ParsedOBZ> {
  return extractOBZ(file, options);
}

/**
 * Decompress an OBZ archive and return its manifest, boards, and resources.
 *
 * @param archive - The OBZ archive as a `File`, `Blob`, `ArrayBuffer`, or
 *   `ArrayBufferView` (e.g. a Node `Buffer`).
 * @param options - Optional {@link UnzipOptions}. `options.limits` caps
 *   declared uncompressed sizes, checked before inflation. No limits are
 *   applied by default.
 * @returns A {@link ParsedOBZ} with the archive's manifest, boards, root
 *   board, and resources.
 *
 * @throws {@link OBFError}; branch on `info.code`: `"not-zip"`,
 *   `"unreadable-zip"`, `"archive-too-large"` (a limit in `options.limits` is
 *   exceeded), `"missing-manifest"`, `"not-json"` or `"invalid-manifest"`
 *   (bad manifest), `"missing-board"`, `"board-id-mismatch"`, or
 *   `"invalid-board"` (a board fails validation). A board's `"not-json"` or
 *   `"invalid-board"` carries its archive `path`, and `"invalid-board"` its
 *   manifest `boardId`.
 * @throws {@link TypeError} if a limit in `options.limits` is `NaN`.
 */
export async function extractOBZ(
  archive: BinaryInput,
  options?: UnzipOptions,
): Promise<ParsedOBZ> {
  const buffer = await toArrayBuffer(archive);

  if (!isZip(buffer)) {
    throw new OBFError({ code: "not-zip" });
  }

  const entries = await unzip(buffer, options);

  const manifest = extractManifest(entries);
  const { boards, rootBoard } = extractBoards(manifest, entries);

  return { manifest, boards, rootBoard, resources: entries };
}

/**
 * Parse and validate an OBZ manifest — the table of contents that maps
 * board IDs to their file paths within the archive.
 *
 * @param json - A JSON string representing the manifest.
 * @returns The validated manifest object.
 *
 * Strips an optional UTF-8 BOM prefix before parsing, like {@link parseOBF}.
 *
 * @throws {@link OBFError} with `info.code` `"not-json"` if the JSON is
 *   malformed, or `"invalid-manifest"` if it fails schema validation.
 */
export function parseManifest(json: string): OBFManifest {
  let data: unknown;

  try {
    data = JSON.parse(stripBom(json)) as unknown;
  } catch (error) {
    throw new OBFError(
      { code: "not-json", source: "manifest" },
      { cause: error },
    );
  }

  const result = OBFManifestSchema.safeParse(data);

  if (!result.success) {
    throw new OBFError(
      { code: "invalid-manifest", issues: result.error.issues },
      { cause: result.error },
    );
  }

  return result.data;
}

/**
 * Bundle boards and optional resources into a compressed OBZ archive.
 *
 * A manifest is generated automatically from the supplied boards,
 * using the `rootBoardId` to designate the entry-point board.
 *
 * Resources in already-compressed formats (PNG, JPEG, GIF, WebP, AVIF, MP3,
 * AAC, Ogg, Opus, MP4, WebM, by file extension) are stored without
 * recompression; everything else is deflated.
 *
 * Boards are written to new paths, so every `load_board` whose `id` names a
 * supplied board gets its `path` set to that board's file. Links without an
 * `id`, or to boards outside the package, are left as they are. The supplied
 * boards are not modified.
 *
 * Every failure is an {@link OBFError}; branch on `info.code`.
 *
 * @param boards - The boards to include in the archive.
 * @param rootBoardId - The entry-point board's ID.
 * @param resources - Optional map of archive paths to binary content.
 * @returns A `Blob` containing the compressed OBZ archive.
 *
 * @throws {@link OBFError} `"unknown-root"` if `rootBoardId` does not match any
 *   supplied board.
 * @throws {@link OBFError} `"duplicate-board"` if two supplied boards share
 *   the same ID.
 * @throws {@link OBFError} `"invalid-board"` if a supplied board fails schema
 *   validation.
 * @throws {@link OBFError} `"conflicting-paths"` if two boards map the same
 *   media ID to different paths.
 * @throws {@link OBFError} `"missing-resource"` if a board declares an image
 *   or sound `path` with no matching entry in `resources`.
 * @throws {@link OBFError} `"path-collision"` if a resource would overwrite
 *   the generated manifest or a board file.
 * @throws {@link OBFError} `"zip-failed"` if archive compression fails.
 */
export async function createOBZ(
  boards: OBFBoard[],
  rootBoardId: string,
  resources?: Map<string, Uint8Array | ArrayBuffer>,
): Promise<Blob> {
  // Validate first, so every later step sees normalized boards (e.g. numeric
  // IDs already coerced to strings) and reports errors against them.
  const validBoards = boards.map((board) => validateBoard(board, {}));

  if (!validBoards.some((board) => board.id === rootBoardId)) {
    throw new OBFError({ code: "unknown-root", rootBoardId });
  }

  const seenBoardIds = new Set<string>();
  for (const board of validBoards) {
    if (seenBoardIds.has(board.id)) {
      throw new OBFError({ code: "duplicate-board", boardId: board.id });
    }
    seenBoardIds.add(board.id);
  }

  const entries = new Map<string, Uint8Array | ArrayBuffer>();

  const pathById = new Map(
    validBoards.map((board) => [board.id, boardPath(board.id)]),
  );
  const boardPaths = Object.fromEntries(pathById);

  pointLinksAtPackagedBoards(validBoards, pathById);

  const imagePaths = collectMediaPaths(validBoards, "images");
  const soundPaths = collectMediaPaths(validBoards, "sounds");

  const manifestResult = OBFManifestSchema.safeParse({
    format: "open-board-0.1",
    root: boardPath(rootBoardId),
    paths: {
      boards: boardPaths,
      images: imagePaths,
      sounds: soundPaths,
    },
  });

  /* v8 ignore start -- defensive: the manifest is built from already-validated inputs */
  if (!manifestResult.success) {
    throw new OBFError(
      { code: "internal", detail: "generated manifest failed validation" },
      { cause: manifestResult.error },
    );
  }
  /* v8 ignore stop */

  const manifest = manifestResult.data;

  const encoder = new TextEncoder();

  entries.set(
    "manifest.json",
    encoder.encode(JSON.stringify(manifest, null, 2)),
  );

  for (const board of validBoards) {
    entries.set(
      boardPaths[board.id]!,
      encoder.encode(JSON.stringify(board, null, 2)),
    );
  }

  if (resources) {
    for (const [path, bytes] of resources) {
      if (entries.has(path)) {
        throw new OBFError({ code: "path-collision", path });
      }
      entries.set(path, bytes);
    }
  }

  assertPathsPresent("image", imagePaths, entries);
  assertPathsPresent("sound", soundPaths, entries);

  const compressed = await zipWithLevels(entries, compressionLevelFor);
  return new Blob([compressed], { type: "application/zip" });
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Set `load_board.path` on every link whose `id` names a packaged board.
 *
 * The spec has links inside an `.obz` point at the linked file by `path`, and
 * readers such as CoughDrop's follow `path` before `id`. Repackaging moves
 * boards to {@link boardPath}, so a path copied from the source archive would
 * otherwise point at a file that no longer exists.
 *
 * Mutates `boards`, which must be the validated copies, not the caller's.
 */
function pointLinksAtPackagedBoards(
  boards: OBFBoard[],
  pathById: ReadonlyMap<string, string>,
): void {
  for (const board of boards) {
    for (const button of board.buttons) {
      const link = button.load_board;
      const target = link?.id === undefined ? undefined : pathById.get(link.id);

      if (link && target !== undefined) {
        link.path = target;
      }
    }
  }
}

/**
 * Derive a board's archive path from its ID.
 *
 * Board IDs may be any non-empty string, but archive paths give `/` and `\`
 * structural meaning. Percent-encoding keeps the mapping deterministic and
 * collision-free without rejecting any valid ID: `/` or `..` is encoded as
 * filename text, never interpreted as a path segment.
 */
function boardPath(id: string): string {
  return `boards/${encodeURIComponent(id)}.obf`;
}

/**
 * Walk every board's media collection and produce the ID-to-path map the spec
 * calls "redundant but still required" for the OBZ manifest.
 *
 * Throws when two boards map the same media ID to different paths. Without
 * this check, the generated manifest could silently point to the wrong file.
 */
function collectMediaPaths(
  boards: OBFBoard[],
  kind: "images" | "sounds",
): Record<string, string> {
  const paths: Record<string, string> = {};

  for (const board of boards) {
    for (const media of board[kind] ?? []) {
      if (media.path === undefined) {
        continue;
      }

      const existing = paths[media.id];
      if (existing !== undefined && existing !== media.path) {
        throw new OBFError({
          code: "conflicting-paths",
          kind: kind === "images" ? "image" : "sound",
          mediaId: media.id,
          paths: [existing, media.path],
        });
      }
      paths[media.id] = media.path;
    }
  }

  return paths;
}

/**
 * Assert that every media path the generated manifest declares exists as an
 * archive entry — the same contract {@link extractOBZ} assumes when reading.
 *
 * Only media with a `path` reach this check, so `url`/`data`-only media are
 * never flagged.
 */
function assertPathsPresent(
  kind: "image" | "sound",
  paths: Record<string, string>,
  entries: Map<string, Uint8Array | ArrayBuffer>,
): void {
  for (const [id, path] of Object.entries(paths)) {
    if (!entries.has(path)) {
      throw new OBFError({
        code: "missing-resource",
        kind,
        mediaId: id,
        path,
      });
    }
  }
}

function extractManifest(entries: Map<string, Uint8Array>): OBFManifest {
  const manifestBytes = entries.get("manifest.json");

  if (!manifestBytes) {
    throw new OBFError({ code: "missing-manifest" });
  }

  const manifestJson = new TextDecoder().decode(manifestBytes);
  return parseManifest(manifestJson);
}

function extractBoards(
  manifest: OBFManifest,
  entries: Map<string, Uint8Array>,
): { boards: Map<string, OBFBoard>; rootBoard: OBFBoard } {
  const boards = new Map<string, OBFBoard>();
  let rootBoard: OBFBoard | undefined;

  for (const [id, path] of Object.entries(manifest.paths.boards)) {
    const boardBytes = entries.get(path);

    if (!boardBytes) {
      throw new OBFError({ code: "missing-board", boardId: id, path });
    }

    const boardJson = new TextDecoder().decode(boardBytes);
    const board = parseBoard(boardJson, { boardId: id, path });

    if (board.id !== id) {
      throw new OBFError({
        code: "board-id-mismatch",
        path,
        declaredId: id,
        actualId: board.id,
      });
    }

    boards.set(id, board);

    if (path === manifest.root) {
      rootBoard = board;
    }
  }

  // `OBFManifestSchema` requires `root` to be one of `paths.boards`, so the loop
  // above always assigns `rootBoard` for the validated manifests we receive.
  /* v8 ignore start -- defensive: OBFManifestSchema guarantees root ∈ paths.boards */
  if (!rootBoard) {
    throw new OBFError({
      code: "internal",
      detail: `root board "${manifest.root}" not found in paths.boards`,
    });
  }
  /* v8 ignore stop */

  return { boards, rootBoard };
}
