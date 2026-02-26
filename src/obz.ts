import { parseOBF } from "./obf";
import type { OBFBoard, OBFManifest } from "./schema";
import { OBFManifestSchema } from "./schema";
import { isZip, unzip, zip } from "./zip";

export interface ParsedOBZ {
  manifest: OBFManifest;
  boards: Map<string, OBFBoard>;
  resources: Map<string, Uint8Array>;
}

/**
 * Load an OBZ archive from a user-selected file.
 */
export async function loadOBZ(file: File): Promise<ParsedOBZ> {
  const archive = await file.arrayBuffer();
  return extractOBZ(archive);
}

/**
 * Extract boards and resources from a raw OBZ archive.
 */
export async function extractOBZ(archive: ArrayBuffer): Promise<ParsedOBZ> {
  if (!isZip(archive)) {
    throw new Error("Invalid OBZ: not a ZIP file");
  }

  const entries = await unzip(archive);

  const manifest = extractManifest(entries);
  const boards = extractBoards(manifest, entries);

  return { manifest, boards, resources: entries };
}

/**
 * Parse and validate a manifest JSON string.
 */
export function parseManifest(json: string): OBFManifest {
  let data: unknown;

  try {
    data = JSON.parse(json) as unknown;
  } catch (error) {
    throw new Error(
      `Invalid manifest: JSON parse failed${
        (error as Error)?.message ? ` — ${(error as Error).message}` : ""
      }`,
    );
  }

  const result = OBFManifestSchema.safeParse(data);

  if (!result.success) {
    throw new Error(`Invalid manifest: ${result.error.message}`);
  }

  return result.data;
}

/**
 * Bundle boards and optional resources into a downloadable OBZ archive.
 */
export async function createOBZ(
  boards: OBFBoard[],
  rootBoardId: string,
  resources?: Map<string, Uint8Array | ArrayBuffer>,
): Promise<Blob> {
  const entries = new Map<string, Uint8Array | ArrayBuffer>();

  const boardPaths = Object.fromEntries(
    boards.map((board) => [board.id, `boards/${board.id}.obf`]),
  );

  const manifest = OBFManifestSchema.parse({
    format: "open-board-0.1",
    root: `boards/${rootBoardId}.obf`,
    paths: { boards: boardPaths, images: {}, sounds: {} },
  });

  const encoder = new TextEncoder();

  entries.set("manifest.json", encoder.encode(JSON.stringify(manifest, null, 2)));

  for (const board of boards) {
    const path = `boards/${board.id}.obf`;
    entries.set(path, encoder.encode(JSON.stringify(board, null, 2)));
  }

  if (resources) {
    for (const [path, bytes] of resources) {
      entries.set(path, bytes);
    }
  }

  const compressed = await zip(entries);
  return new Blob([new Uint8Array(compressed)], { type: "application/zip" });
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function extractManifest(entries: Map<string, Uint8Array>): OBFManifest {
  const manifestBytes = entries.get("manifest.json");

  if (!manifestBytes) {
    throw new Error("Invalid OBZ: missing manifest.json");
  }

  const manifestJson = new TextDecoder().decode(manifestBytes);
  return parseManifest(manifestJson);
}

function extractBoards(
  manifest: OBFManifest,
  entries: Map<string, Uint8Array>,
): Map<string, OBFBoard> {
  const boards = new Map<string, OBFBoard>();

  for (const [id, path] of Object.entries(manifest.paths.boards)) {
    const boardBytes = entries.get(path);

    if (!boardBytes) {
      throw new Error(`Board "${id}" declared in manifest but missing at path "${path}"`);
    }

    const boardJson = new TextDecoder().decode(boardBytes);
    boards.set(id, parseOBF(boardJson));
  }

  return boards;
}
