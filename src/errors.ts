/**
 * Typed errors for `@shayc/open-board-format`.
 *
 * Every failure thrown by this package is an {@link OBFError} carrying a
 * discriminated {@link OBFErrorInfo} on its `info` property. Switch on
 * `error.info.code` to get exactly the structured context for that failure —
 * the human-readable `message` is derived from `info` and is not part of the
 * stable contract.
 *
 * ```ts
 * try {
 *   await loadBoard(file);
 * } catch (error) {
 *   if (!(error instanceof OBFError)) throw error;
 *   switch (error.info.code) {
 *     case "missing-resource":
 *       reupload(error.info.kind, error.info.path); // both fully typed
 *       break;
 *     case "invalid-board":
 *       showIssues(error.info.issues);
 *       break;
 *   }
 * }
 * ```
 */

import { z } from "zod";

/**
 * A single schema validation problem — Zod's issue shape, re-exported under a
 * domain name. `z.core.$ZodIssue` is the type Zod v4 designates for libraries
 * built on it (the bare `z.ZodIssue` is deprecated in its favor); aliasing it
 * gives consumers a stable OBF name without reaching into Zod's `core` export.
 */
export type OBFIssue = z.core.$ZodIssue;

/**
 * Discriminated description of why an {@link OBFError} was thrown.
 *
 * Switch on `code`; each variant carries the fields relevant to it. When a
 * failure wraps an underlying error it lives on the standard `error.cause`,
 * never duplicated here. The only optional field is `invalid-board`'s
 * `boardId`, absent when validation runs on a value with no known id.
 */
export type OBFErrorInfo =
  // --- decoding (underlying parser/decompressor error on `error.cause`) ---
  /** Input was not parseable JSON. */
  | { code: "not-json"; source: "board" | "manifest" }
  /** An OBZ archive was expected, but the bytes are not a ZIP. */
  | { code: "not-zip" }
  /** A ZIP archive could not be decompressed. */
  | { code: "unreadable-zip" }
  // --- validation (underlying `ZodError` on `error.cause`) ---
  /** A board failed schema validation. `boardId` is set when known. */
  | { code: "invalid-board"; boardId?: string; issues: readonly OBFIssue[] }
  /** A manifest failed schema validation. */
  | { code: "invalid-manifest"; issues: readonly OBFIssue[] }
  // --- archive structure (reading an .obz) ---
  /** The archive has no `manifest.json`. */
  | { code: "missing-manifest" }
  /** A board the manifest declares is absent from the archive. */
  | { code: "missing-board"; boardId: string; path: string }
  /** A board's `id` disagrees with the id the manifest declares for it. */
  | {
      code: "board-id-mismatch";
      path: string;
      declaredId: string;
      actualId: string;
    }
  // --- archive assembly (createOBZ) ---
  /** `rootBoardId` matches none of the supplied boards. */
  | { code: "unknown-root"; rootBoardId: string }
  /** Two supplied boards share the same `id`. */
  | { code: "duplicate-board"; boardId: string }
  /** A board declares a media `path` with no matching resource. */
  | {
      code: "missing-resource";
      kind: "image" | "sound";
      mediaId: string;
      path: string;
    }
  /** Two boards declare the same media id with different paths. */
  | {
      code: "conflicting-paths";
      kind: "image" | "sound";
      mediaId: string;
      paths: [string, string];
    }
  /** A supplied resource would overwrite a generated board or the manifest. */
  | { code: "path-collision"; path: string }
  /** The archive could not be compressed. */
  | { code: "zip-failed" }
  /** An internal invariant was violated — a bug in this library; please report. */
  | { code: "internal"; detail: string };

/** Every `code` an {@link OBFError} can carry. */
export type OBFErrorCode = OBFErrorInfo["code"];

/**
 * The single error type thrown by `@shayc/open-board-format`.
 *
 * Branch on {@link OBFError.info} (a discriminated {@link OBFErrorInfo}) rather
 * than parsing {@link OBFError.message}. Any underlying error — a `JSON.parse`
 * failure, a `ZodError`, or an fflate error — is on the standard `error.cause`.
 */
export class OBFError extends Error {
  /** Structured, discriminated description of the failure. */
  readonly info: OBFErrorInfo;

  constructor(info: OBFErrorInfo, options?: { cause?: unknown }) {
    super(formatOBFError(info), options);
    this.name = "OBFError";
    this.info = info;
  }
}

/** Derive a human-readable message from an {@link OBFErrorInfo}. */
function formatOBFError(info: OBFErrorInfo): string {
  switch (info.code) {
    case "not-json":
      return `Invalid ${info.source === "manifest" ? "OBZ manifest" : "OBF"}: not valid JSON`;
    case "not-zip":
      return "Invalid OBZ: not a ZIP file";
    case "unreadable-zip":
      return "ZIP archive could not be read";
    case "invalid-board": {
      const subject = info.boardId ? `board "${info.boardId}"` : "board";
      return `Invalid OBF ${subject}:\n${prettifyIssues(info.issues)}`;
    }
    case "invalid-manifest":
      return `Invalid OBZ manifest:\n${prettifyIssues(info.issues)}`;
    case "missing-manifest":
      return "Invalid OBZ: missing manifest.json";
    case "missing-board":
      return `Invalid OBZ: board "${info.boardId}" is declared in the manifest but missing at "${info.path}"`;
    case "board-id-mismatch":
      return `Invalid OBZ: board at "${info.path}" has id "${info.actualId}" but the manifest declares it as "${info.declaredId}"`;
    case "unknown-root":
      return `Invalid OBZ: rootBoardId "${info.rootBoardId}" does not match any supplied board`;
    case "duplicate-board":
      return `Invalid OBZ: duplicate board id "${info.boardId}" — board ids must be unique within a package`;
    case "missing-resource":
      return `Invalid OBZ: ${info.kind} "${info.mediaId}" references "${info.path}" but no matching resource was supplied`;
    case "conflicting-paths":
      return `Invalid OBZ: ${info.kind} id "${info.mediaId}" maps to conflicting paths "${info.paths[0]}" and "${info.paths[1]}"`;
    case "path-collision":
      return `Invalid OBZ: resource path "${info.path}" collides with a generated board or manifest entry`;
    case "zip-failed":
      return "Failed to build ZIP archive";
    case "internal":
      return `Internal error (please report): ${info.detail}`;
    /* v8 ignore start -- exhaustiveness guard: unreachable, enforced at compile time */
    default: {
      const _exhaustive: never = info;
      return _exhaustive;
    }
    /* v8 ignore stop */
  }
}

/** Render schema issues using Zod's pretty formatter. */
function prettifyIssues(issues: readonly OBFIssue[]): string {
  return z.prettifyError(new z.ZodError([...issues]));
}
