/**
 * Zod schemas for the Open Board Format (OBF) data model.
 *
 * Official OBF specification: https://www.openboardformat.org/docs
 */

import { z } from "zod";

/** Optional URL that treats empty strings as undefined. */
const OBFOptionalUrlSchema = z
  .union([z.url(), z.literal("")])
  .transform((val) => (val === "" ? undefined : val))
  .optional();

/** Optional email that treats empty strings as undefined. */
const OBFOptionalEmailSchema = z
  .union([z.email(), z.literal("")])
  .transform((val) => (val === "" ? undefined : val))
  .optional();

/** Optional ID that treats empty strings as undefined. */
const OBFOptionalIDSchema = z
  .union([z.string(), z.number()])
  .transform((val) => {
    const str = String(val);
    return str === "" ? undefined : str;
  })
  .optional();

/** Unique board-element identifier, coerced to a non-empty string. */
export const OBFIDSchema = z
  .union([z.string(), z.number()])
  .transform((val) => String(val))
  .pipe(z.string().min(1));

/** Unique board-element identifier, coerced to a non-empty string. See {@link OBFIDSchema}. */
export type OBFID = z.infer<typeof OBFIDSchema>;

/** Format version of the Open Board Format, e.g., `open-board-0.1`. */
export const OBFFormatVersionSchema = z.string().regex(/^open-board-.+$/);

/** Format version of the Open Board Format, e.g., `open-board-0.1`. See {@link OBFFormatVersionSchema}. */
export type OBFFormatVersion = z.infer<typeof OBFFormatVersionSchema>;

/**
 * Locale identifier, typically a BCP 47 language tag (e.g., `en`, `en-US`,
 * `fr-CA`). Not strictly validated — any string is accepted.
 */
export const OBFLocaleCodeSchema = z.string();

/** Locale identifier, typically a BCP 47 language tag, e.g., `en`, `en-US`. See {@link OBFLocaleCodeSchema}. */
export type OBFLocaleCode = z.infer<typeof OBFLocaleCodeSchema>;

/**
 * Translations for a single locale, keyed by the source string,
 * e.g., `{ "hello": "hola" }`.
 */
export const OBFLocalizedStringsSchema = z.record(z.string(), z.string());

/** Translations for a single locale, keyed by the source string. See {@link OBFLocalizedStringsSchema}. */
export type OBFLocalizedStrings = z.infer<typeof OBFLocalizedStringsSchema>;

/**
 * Locale-keyed dictionary of translated strings,
 * e.g., `{ en: { greeting: "Hello" }, fr: { greeting: "Bonjour" } }`.
 */
export const OBFStringsSchema = z.record(z.string(), OBFLocalizedStringsSchema);

/** Locale-keyed dictionary of translated strings. See {@link OBFStringsSchema}. */
export type OBFStrings = z.infer<typeof OBFStringsSchema>;

/**
 * Spelling action: a `+` prefix followed by the text to append,
 * e.g., `+hello`.
 */
export const OBFSpellingActionSchema = z.string().regex(/^\+.+$/);

/** Spelling action: a `+` prefix followed by the text to append, e.g., `+hello`. See {@link OBFSpellingActionSchema}. */
export type OBFSpellingAction = z.infer<typeof OBFSpellingActionSchema>;

/**
 * Specialty action prefixed with `:`, e.g., `:clear`.
 * Custom extensions use the `:ext_` prefix.
 */
export const OBFSpecialtyActionSchema = z
  .string()
  .regex(/^:[a-z][a-z0-9_-]*$/i);

/** Specialty action prefixed with `:`, e.g., `:clear`. See {@link OBFSpecialtyActionSchema}. */
export type OBFSpecialtyAction = z.infer<typeof OBFSpecialtyActionSchema>;

/** Union of spelling and specialty actions that a button can trigger. */
export const OBFButtonActionSchema = z.union([
  OBFSpellingActionSchema,
  OBFSpecialtyActionSchema,
]);

/** Union of spelling and specialty actions that a button can trigger. See {@link OBFButtonActionSchema}. */
export type OBFButtonAction = z.infer<typeof OBFButtonActionSchema>;

/** License terms and attribution for a resource. */
export const OBFLicenseSchema = z.looseObject({
  /** Type of the license, e.g., `CC-BY-SA`. */
  type: z.string(),
  /** URL to the license terms. */
  copyright_notice_url: OBFOptionalUrlSchema,
  /** Source URL of the resource. */
  source_url: OBFOptionalUrlSchema,
  /** Name of the author. */
  author_name: z.string().optional(),
  /** URL of the author's webpage. */
  author_url: OBFOptionalUrlSchema,
  /** Email address of the author. */
  author_email: OBFOptionalEmailSchema,
});

/** License terms and attribution for a resource. See {@link OBFLicenseSchema}. */
export type OBFLicense = z.infer<typeof OBFLicenseSchema>;

/**
 * Common properties for media resources (images and sounds).
 *
 * When multiple references are provided, they should be used in the following order:
 * 1. `data`
 * 2. `path`
 * 3. `url`
 *
 * `data_url` is not part of this fallback chain — it is an API endpoint for
 * retrieving information about the resource, not an alternative source of
 * the media bytes.
 */
export const OBFMediaSchema = z.looseObject({
  /** Unique identifier for the media resource. */
  id: OBFIDSchema,
  /** Media data inlined as a `data:` URI. */
  data: z.string().optional(),
  /** Path to the media file within an `.obz` package. */
  path: z.string().optional(),
  /**
   * URL of an API endpoint for fetching the media programmatically —
   * not a `data:` URI (that is `data`).
   */
  data_url: OBFOptionalUrlSchema,
  /** URL to the media resource. */
  url: OBFOptionalUrlSchema,
  /** MIME type of the media, e.g., `image/png`, `audio/mpeg`. */
  content_type: z.string().optional(),
  /** Licensing information for the media. */
  license: OBFLicenseSchema.optional(),
});

/** Common properties for media resources (images and sounds). See {@link OBFMediaSchema}. */
export type OBFMedia = z.infer<typeof OBFMediaSchema>;

/** Reference to a symbol in a proprietary symbol set (e.g., SymbolStix). */
export const OBFSymbolInfoSchema = z.looseObject({
  /** Name of the symbol set, e.g., `symbolstix`. */
  set: z.string(),
  /** Filename of the symbol within the set. */
  filename: z.string(),
});

/** Reference to a symbol in a proprietary symbol set. See {@link OBFSymbolInfoSchema}. */
export type OBFSymbolInfo = z.infer<typeof OBFSymbolInfoSchema>;

/**
 * Image resource, extending {@link OBFMediaSchema} with optional
 * symbol and dimension properties.
 *
 * When resolving the image, consumers should prefer sources in this order:
 * 1. `data`
 * 2. `path`
 * 3. `url`
 * 4. `symbol`
 */
export const OBFImageSchema = OBFMediaSchema.extend({
  /** Information about a symbol from a proprietary symbol set. */
  symbol: OBFSymbolInfoSchema.optional(),
  /** Width of the image in pixels. */
  width: z.number().optional(),
  /** Height of the image in pixels. */
  height: z.number().optional(),
});

/** Image resource with optional symbol and dimension properties. See {@link OBFImageSchema}. */
export type OBFImage = z.infer<typeof OBFImageSchema>;

/**
 * Audio resource. Identical to {@link OBFMediaSchema} — no additional properties.
 */
export const OBFSoundSchema = OBFMediaSchema;

/** Audio resource, identical to {@link OBFMediaSchema}. See {@link OBFSoundSchema}. */
export type OBFSound = z.infer<typeof OBFSoundSchema>;

/** Reference to another board, resolved by ID, path, or URL. */
export const OBFLoadBoardSchema = z.looseObject({
  /** Unique identifier of the board to load. */
  id: OBFOptionalIDSchema,
  /** Name of the board to load. */
  name: z.string().optional(),
  /**
   * URL of an API endpoint for fetching the board programmatically —
   * not a `data:` URI.
   */
  data_url: OBFOptionalUrlSchema,
  /** URL to access the board via a web browser. */
  url: OBFOptionalUrlSchema,
  /** Path to the board within an `.obz` package. */
  path: z.string().optional(),
});

/** Reference to another board, resolved by ID, path, or URL. See {@link OBFLoadBoardSchema}. */
export type OBFLoadBoard = z.infer<typeof OBFLoadBoardSchema>;

/**
 * Interactive element on a board, optionally linked to images, sounds, and actions.
 */
export const OBFButtonSchema = z
  .looseObject({
    /** Unique identifier for the button. */
    id: OBFIDSchema,
    /** Label text displayed on the button. */
    label: z.string().optional(),
    /** Alternative text for vocalization when the button is activated. */
    vocalization: z.string().optional(),
    /** Identifier of the image associated with the button. */
    image_id: OBFOptionalIDSchema,
    /** Identifier of the sound associated with the button. */
    sound_id: OBFOptionalIDSchema,
    /**
     * Action triggered by the button. When `actions` is also set, this is
     * the single-action fallback for apps that support one action per button.
     */
    action: OBFButtonActionSchema.optional(),
    /**
     * Multiple actions executed in order. Apps that support it should
     * prefer this over the single `action` fallback.
     */
    actions: z.array(OBFButtonActionSchema).optional(),
    /** Information to load another board when this button is activated. */
    load_board: OBFLoadBoardSchema.optional(),
    /**
     * Background color of the button, typically `rgb`/`rgba`. Not
     * strictly validated — any string is accepted.
     */
    background_color: z.string().optional(),
    /**
     * Border color of the button, typically `rgb`/`rgba`. Not strictly
     * validated — any string is accepted.
     */
    border_color: z.string().optional(),
    /** Vertical position for absolute positioning (0.0 to 1.0). */
    top: z.number().min(0).max(1).optional(),
    /** Horizontal position for absolute positioning (0.0 to 1.0). */
    left: z.number().min(0).max(1).optional(),
    /** Width of the button for absolute positioning (0.0 to 1.0). */
    width: z.number().min(0).max(1).optional(),
    /** Height of the button for absolute positioning (0.0 to 1.0). */
    height: z.number().min(0).max(1).optional(),
  })
  .refine(
    (b) => {
      const set = [b.top, b.left, b.width, b.height].filter(
        (v) => v !== undefined,
      );
      return set.length === 0 || set.length === 4;
    },
    {
      message:
        "Absolute positioning requires all of top, left, width, and height (or none)",
    },
  );

/** Interactive element on a board, optionally linked to images, sounds, and actions. See {@link OBFButtonSchema}. */
export type OBFButton = z.infer<typeof OBFButtonSchema>;

/**
 * Row-and-column layout that arranges buttons by their IDs.
 */
export const OBFGridSchema = z
  .looseObject({
    /** Number of rows in the grid. */
    rows: z.number().int().min(1),
    /** Number of columns in the grid. */
    columns: z.number().int().min(1),
    /**
     * 2D array representing the order of buttons by their IDs.
     * Each sub-array corresponds to a row, and each element is a button ID or null for empty slots.
     */
    order: z.array(z.array(z.union([OBFIDSchema, z.null()]))),
  })
  .refine((g) => g.order.length === g.rows, {
    message: "Grid order length must match rows",
  })
  .refine((g) => g.order.every((row) => row.length === g.columns), {
    message: "Each grid row must have length equal to columns",
  });

/** Row-and-column layout that arranges buttons by their IDs. See {@link OBFGridSchema}. */
export type OBFGrid = z.infer<typeof OBFGridSchema>;

/**
 * Root object of an `.obf` file: the complete definition of a single communication board.
 */
export const OBFBoardSchema = z.looseObject({
  /** Format version of the Open Board Format, e.g., `open-board-0.1`. */
  format: OBFFormatVersionSchema,
  /** Unique identifier for the board. */
  id: OBFIDSchema,
  /** Locale of the board as a BCP 47 language tag, e.g., `en`, `en-US`. */
  locale: OBFLocaleCodeSchema.optional(),
  /** List of buttons on the board. */
  buttons: z.array(OBFButtonSchema),
  /** URL where the board can be accessed or downloaded. */
  url: OBFOptionalUrlSchema,
  /** Name of the board. */
  name: z.string().optional(),
  /** Description of the board in HTML format. */
  description_html: z.string().optional(),
  /** Grid layout information for arranging buttons. */
  grid: OBFGridSchema,
  /** List of images used in the board. */
  images: z.array(OBFImageSchema).optional(),
  /** List of sounds used in the board. */
  sounds: z.array(OBFSoundSchema).optional(),
  /** Licensing information for the board. */
  license: OBFLicenseSchema.optional(),
  /** String translations for multiple locales. */
  strings: OBFStringsSchema.optional(),
});

/** Root object of an `.obf` file: the complete definition of a single communication board. See {@link OBFBoardSchema}. */
export type OBFBoard = z.infer<typeof OBFBoardSchema>;

/**
 * Table of contents for an `.obz` package, mapping resource IDs to their archive paths.
 */
export const OBFManifestSchema = z
  .looseObject({
    /** Format version of the Open Board Format, e.g., `open-board-0.1`. */
    format: OBFFormatVersionSchema,
    /** Path to the root board within the `.obz` package. */
    root: z.string(),
    /** Mapping of IDs to paths for boards, images, and sounds. */
    paths: z.looseObject({
      /** Mapping of board IDs to their file paths. */
      boards: z.record(z.string(), z.string()),
      /** Mapping of image IDs to their file paths. */
      images: z.record(z.string(), z.string()).optional(),
      /** Mapping of sound IDs to their file paths. */
      sounds: z.record(z.string(), z.string()).optional(),
    }),
  })
  .refine((m) => Object.values(m.paths.boards).includes(m.root), {
    message: "root must be listed in paths.boards",
    path: ["root"],
  });

/** Table of contents for an `.obz` package, mapping resource IDs to their archive paths. See {@link OBFManifestSchema}. */
export type OBFManifest = z.infer<typeof OBFManifestSchema>;
