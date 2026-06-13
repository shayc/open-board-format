/**
 * Creation and extraction of `.obz` board packages.
 */

import { OBFError } from "./errors";
import { parseOBF } from "./obf";
import type { OBFBoard, OBFManifest } from "./schema";
import { OBFBoardSchema, OBFManifestSchema } from "./schema";
import { isZip, unzip, zip } from "./zip";

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
 * This relies on the browser `File` API; for Node environments,
 * read the file to an `ArrayBuffer` and pass it to {@link extractOBZ} instead.
 *
 * @param file - A `File` handle pointing to an `.obz` archive.
 * @returns The parsed manifest, boards, root board, and binary resources.
 *
 * @throws {@link OBFError} — the same failures as {@link extractOBZ}, which
 *   this delegates to.
 */
export async function loadOBZ(file: File): Promise<ParsedOBZ> {
  const archive = await file.arrayBuffer();
  return extractOBZ(archive);
}

/**
 * Decompress an OBZ archive and return its manifest, boards, and resources.
 *
 * @param archive - The OBZ archive as an `ArrayBuffer`.
 * @returns The parsed manifest, a map of board IDs to validated boards,
 *          the resolved root board, and a map of file paths to their
 *          binary content.
 *
 * @throws {@link OBFError}; branch on `info.code`: `"not-zip"`,
 *   `"unreadable-zip"`, `"missing-manifest"`, `"not-json"` or
 *   `"invalid-manifest"` (bad manifest), `"missing-board"`,
 *   `"board-id-mismatch"`, or `"invalid-board"` (a board fails validation).
 */
export async function extractOBZ(archive: ArrayBuffer): Promise<ParsedOBZ> {
  if (!isZip(archive)) {
    throw new OBFError({ code: "not-zip" });
  }

  const entries = await unzip(archive);

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
    throw new OBFError({ code: "not-json", source: "manifest", cause: error });
  }

  const result = OBFManifestSchema.safeParse(data);

  if (!result.success) {
    throw new OBFError({
      code: "invalid-manifest",
      issues: result.error.issues,
      cause: result.error,
    });
  }

  return result.data;
}

/**
 * Bundle boards and optional resources into a compressed OBZ archive.
 *
 * A manifest is generated automatically from the supplied boards,
 * using the `rootBoardId` to designate the entry-point board.
 *
 * @param boards - The boards to include in the archive.
 * @param rootBoardId - The ID of the board that serves as the archive's entry point.
 * @param resources - Optional map of file paths to binary content (images, sounds, etc.).
 * @returns A `Blob` containing the compressed OBZ archive.
 *
 * All failures are an {@link OBFError}; branch on `info.code`:
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
    boards.map((board) => [board.id, `boards/${board.id}.obf`]),
  );

  const imagePaths = collectMediaPaths(boards, "images");
  const soundPaths = collectMediaPaths(boards, "sounds");

  const manifestResult = OBFManifestSchema.safeParse({
    format: "open-board-0.1",
    root: `boards/${rootBoardId}.obf`,
    paths: {
      boards: boardPaths,
      images: imagePaths,
      ...(Object.keys(soundPaths).length > 0 ? { sounds: soundPaths } : {}),
    },
  });

  if (!manifestResult.success) {
    throw new OBFError({
      code: "invalid-manifest",
      issues: manifestResult.error.issues,
      cause: manifestResult.error,
    });
  }

  const manifest = manifestResult.data;

  const encoder = new TextEncoder();

  entries.set(
    "manifest.json",
    encoder.encode(JSON.stringify(manifest, null, 2)),
  );

  for (const board of boards) {
    const result = OBFBoardSchema.safeParse(board);
    if (!result.success) {
      throw new OBFError({
        code: "invalid-board",
        boardId: board.id,
        issues: result.error.issues,
        cause: result.error,
      });
    }
    const path = `boards/${result.data.id}.obf`;
    entries.set(path, encoder.encode(JSON.stringify(result.data, null, 2)));
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
  return { boards, rootBoard: rootBoard! };
}
