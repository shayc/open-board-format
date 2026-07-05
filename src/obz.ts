/**
 * Creation and extraction of `.obz` board packages.
 */

import { OBFError } from "./errors";
import { parseOBF } from "./obf";
import type { OBFBoard, OBFManifest } from "./schema";
import { OBFBoardSchema, OBFManifestSchema } from "./schema";
import type { BinaryInput, UnzipOptions } from "./zip";
import { isZip, toArrayBuffer, unzip, zip } from "./zip";

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
 *          board, and resources.
 *
 * @throws {@link OBFError}; branch on `info.code`: `"not-zip"`,
 *   `"unreadable-zip"`, `"archive-too-large"` (a limit in `options.limits` is
 *   exceeded), `"missing-manifest"`, `"not-json"` or `"invalid-manifest"`
 *   (bad manifest), `"missing-board"`, `"board-id-mismatch"`, or
 *   `"invalid-board"` (a board fails validation).
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
 * @throws {@link OBFError} with `info.code` `"not-json"` if the JSON is
 *   malformed, or `"invalid-manifest"` if it fails schema validation.
 */
export function parseManifest(json: string): OBFManifest {
  let data: unknown;

  try {
    data = JSON.parse(json) as unknown;
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
 * Every failure is an {@link OBFError}; branch on `info.code`.
 *
 * @param boards - The boards to include in the archive.
 * @param rootBoardId - The ID of the board that serves as the archive's entry point.
 * @param resources - Optional map of file paths to binary content (images, sounds, etc.).
 * @returns A `Blob` containing the compressed OBZ archive.
 *
 * @throws {@link OBFError} `"unknown-root"` if `rootBoardId` does not match any of the supplied boards.
 * @throws {@link OBFError} `"duplicate-board"` if two supplied boards share the same ID.
 * @throws {@link OBFError} `"invalid-board"` if a supplied board fails schema validation.
 * @throws {@link OBFError} `"conflicting-paths"` if two boards declare the same media ID with conflicting paths.
 * @throws {@link OBFError} `"missing-resource"` if a board declares an image or sound `path` with no matching entry in `resources`.
 * @throws {@link OBFError} `"path-collision"` if a `resources` entry would overwrite the generated `manifest.json` or a board file.
 */
export async function createOBZ(
  boards: OBFBoard[],
  rootBoardId: string,
  resources?: Map<string, Uint8Array | ArrayBuffer>,
): Promise<Blob> {
  if (!boards.some((board) => board.id === rootBoardId)) {
    throw new OBFError({ code: "unknown-root", rootBoardId });
  }

  const seenBoardIds = new Set<string>();
  for (const board of boards) {
    if (seenBoardIds.has(board.id)) {
      throw new OBFError({ code: "duplicate-board", boardId: board.id });
    }
    seenBoardIds.add(board.id);
  }

  const entries = new Map<string, Uint8Array | ArrayBuffer>();

  const boardPaths = Object.fromEntries(
    boards.map((board) => [board.id, boardPath(board.id)]),
  );

  const imagePaths = collectMediaPaths(boards, "images");
  const soundPaths = collectMediaPaths(boards, "sounds");

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

  for (const board of boards) {
    const result = OBFBoardSchema.safeParse(board);
    if (!result.success) {
      throw new OBFError(
        {
          code: "invalid-board",
          boardId: board.id,
          issues: result.error.issues,
        },
        { cause: result.error },
      );
    }

    entries.set(
      boardPaths[board.id]!,
      encoder.encode(JSON.stringify(result.data, null, 2)),
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

  const compressed = await zip(entries);
  return new Blob([compressed], { type: "application/zip" });
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Derive a board's archive path from its id.
 *
 * Board ids are spec-legal as any non-empty string, but archive paths give
 * `/` and `\` structural meaning. Percent-encoding the id keeps the mapping
 * deterministic and collision-free without rejecting any id the schema
 * already allows — a `/` or `..` in the id just becomes part of a filename,
 * never a path segment.
 */
function boardPath(id: string): string {
  return `boards/${encodeURIComponent(id)}.obf`;
}

/**
 * Walk every board's media collection and produce the `{ id -> path }` map
 * the spec calls "redundant but still required" for the OBZ manifest.
 *
 * Throws when two boards declare the same media ID with conflicting paths
 * — a silent OBZ that points at a non-existent file is worse than a clear error.
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
 * Only media that declared a `path` reach this check, so `url`/`data`-only
 * media are never flagged.
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
    const board = parseOBF(boardJson);

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
