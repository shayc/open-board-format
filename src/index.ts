/**
 * Public API of `@shayc/open-board-format`.
 */

// Zod schemas and inferred types for the OBF data model
export type {
  OBFBoard,
  OBFButton,
  OBFButtonAction,
  OBFFormatVersion,
  OBFGrid,
  OBFID,
  OBFImage,
  OBFLicense,
  OBFLoadBoard,
  OBFLocaleCode,
  OBFLocalizedStrings,
  OBFManifest,
  OBFMedia,
  OBFSound,
  OBFSpecialtyAction,
  OBFSpellingAction,
  OBFStrings,
  OBFSymbolInfo,
} from "./schema";

export {
  OBFBoardSchema,
  OBFButtonActionSchema,
  OBFButtonSchema,
  OBFFormatVersionSchema,
  OBFGridSchema,
  OBFIDSchema,
  OBFImageSchema,
  OBFLicenseSchema,
  OBFLoadBoardSchema,
  OBFLocaleCodeSchema,
  OBFLocalizedStringsSchema,
  OBFManifestSchema,
  OBFMediaSchema,
  OBFSoundSchema,
  OBFSpecialtyActionSchema,
  OBFSpellingActionSchema,
  OBFStringsSchema,
  OBFSymbolInfoSchema,
} from "./schema";

// Typed errors thrown across the package
export { OBFError } from "./errors";
export type { OBFErrorCode, OBFErrorInfo, OBFIssue } from "./errors";

// Single-board (.obf) parsing, validation, and serialization
export { loadOBF, parseOBF, stringifyOBF, validateOBF } from "./obf";

// Board-package (.obz) creation and extraction
export { createOBZ, extractOBZ, loadOBZ, parseManifest } from "./obz";
export type { ParsedOBZ } from "./obz";

// Format-agnostic loading of .obf or .obz input
export { loadBoard } from "./load-board";
export type { LoadedBoard } from "./load-board";

// ZIP helpers
export { isZip, unzip, zip } from "./zip";
