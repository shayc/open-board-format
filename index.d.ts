/**
 * Open Board Format (OBF) TypeScript Definitions
 *
 * These definitions represent the Open Board Format, designed for sharing communication boards and board sets
 * between Augmentative and Alternative Communication (AAC) applications.
 *
 * Official OBF specification: https://www.openboardformat.org/docs
 *
 * @author Shay Cojocaru
 * @license MIT
 */

/** Unique identifier as a string. */
export type UUID = string;

/**
 * Format version of the Open Board Format, e.g., 'open-board-0.1'.
 */
export type FormatVersion = `open-board-${string}`;

/**
 * Custom extension properties. Keys must start with 'ext_'.
 */
export type Extensions = {
  [key: `ext_${string}`]: any;
};

/**
 * Locale code as per BCP 47 language tags, e.g., 'en', 'en-US', 'fr-CA'.
 */
export type LocaleCode = string;

/**
 * Mapping of string keys to localized string values.
 */
export type LocalizedStrings = Record<string, string>;

/**
 * String translations for multiple locales.
 */
export type Strings = Record<LocaleCode, LocalizedStrings>;

/**
 * Represents custom actions for spelling.
 * Prefixed with '+' followed by the text to append.
 */
export type SpellingAction = `+${string}`;

/**
 * Represents specialty actions.
 * Standard actions are prefixed with ':'.
 * Custom actions start with ':ext_'.
 */
export type SpecialtyAction =
  | ":space" // Finish spelling and start a new word.
  | ":clear" // Clear the sentence box.
  | ":home" // Return to the user's home board.
  | ":speak" // Speak the current sentence box contents.
  | ":backspace" // Remove the last entry in the sentence box.
  | `:ext_${string}`; // Custom specialty actions.

/**
 * Possible actions associated with a button.
 */
export type ButtonAction = SpellingAction | SpecialtyAction;

/**
 * Licensing information for a resource.
 */
export interface License extends Extensions {
  /** Type of the license, e.g., 'CC-BY-SA'. */
  type: string;
  /** URL to the license terms. */
  copyright_notice_url?: string;
  /** Source URL of the resource. */
  source_url?: string;
  /** Name of the author. */
  author_name?: string;
  /** URL of the author's webpage. */
  author_url?: string;
  /** Email address of the author. */
  author_email?: string;
}

/**
 * Common properties for media resources (images and sounds).
 *
 * When multiple references are provided, they should be used in the following order:
 * 1. data
 * 2. path
 * 3. url
 */
export interface Media extends Extensions {
  /** Unique identifier for the media resource. */
  id: UUID;
  /** Data URI containing the media data. */
  data?: string;
  /** Path to the media file within an .obz package. */
  path?: string;
  /** URL to the media resource. */
  url?: string;
  /** MIME type of the media, e.g., 'image/png', 'audio/mpeg'. */
  content_type?: string;
  /** Licensing information for the media. */
  license?: License;
}

/**
 * Information about a symbol from a proprietary symbol set.
 */
export interface SymbolInfo {
  /** Name of the symbol set, e.g., 'symbolstix'. */
  set: string;
  /** Filename of the symbol within the set. */
  filename: string;
}

/**
 * Represents an image resource.
 *
 * When resolving the image, if multiple references are provided, they should be used in the following order:
 * 1. data
 * 2. path
 * 3. url
 * 4. symbol
 */
export interface Image extends Media {
  /** Information about a symbol from a proprietary symbol set. */
  symbol?: SymbolInfo;
  /** Width of the image in pixels. */
  width?: number;
  /** Height of the image in pixels. */
  height?: number;
}

/**
 * Represents a sound resource.
 */
export interface Sound extends Media {
  // No additional properties.
}

/**
 * Information needed to load another board.
 */
export interface LoadBoard extends Extensions {
  /** Unique identifier of the board to load. */
  id?: UUID;
  /** Name of the board to load. */
  name?: string;
  /** Data URL to fetch the board programmatically. */
  data_url?: string;
  /** URL to access the board via a web browser. */
  url?: string;
  /** Path to the board within an .obz package. */
  path?: string;
}

/**
 * Represents a button on the board.
 */
export interface Button extends Extensions {
  /** Unique identifier for the button. */
  id: UUID;
  /** Label text displayed on the button. */
  label?: string;
  /** Alternative text for vocalization when the button is activated. */
  vocalization?: string;
  /** Identifier of the image associated with the button. */
  image_id?: UUID;
  /** Identifier of the sound associated with the button. */
  sound_id?: UUID;
  /** Action associated with the button. */
  action?: ButtonAction;
  /** List of multiple actions for the button, executed in order. */
  actions?: ButtonAction[];
  /** Information to load another board when this button is activated. */
  load_board?: LoadBoard;
  /** Background color of the button in 'rgb' or 'rgba' format. */
  background_color?: string;
  /** Border color of the button in 'rgb' or 'rgba' format. */
  border_color?: string;
  /** Vertical position for absolute positioning (0.0 to 1.0). */
  top?: number;
  /** Horizontal position for absolute positioning (0.0 to 1.0). */
  left?: number;
  /** Width of the button for absolute positioning (0.0 to 1.0). */
  width?: number;
  /** Height of the button for absolute positioning (0.0 to 1.0). */
  height?: number;
}

/**
 * Grid layout information for the board.
 */
export interface Grid {
  /** Number of rows in the grid. */
  rows: number;
  /** Number of columns in the grid. */
  columns: number;
  /**
   * 2D array representing the order of buttons by their IDs.
   * Each sub-array corresponds to a row, and each element is a button ID or null for empty slots.
   */
  order: (UUID | null)[][];
}

/**
 * Represents the root object of an OBF file, defining the structure and layout of a board.
 */
export interface Board extends Extensions {
  /** Format version of the Open Board Format, e.g., 'open-board-0.1'. */
  format: FormatVersion;
  /** Unique identifier for the board. */
  id: UUID;
  /** Locale of the board as a BCP 47 language tag, e.g., 'en', 'en-US'. */
  locale: LocaleCode;
  /** List of buttons on the board. */
  buttons: Button[];
  /** URL where the board can be accessed or downloaded. */
  url?: string;
  /** Name of the board. */
  name?: string;
  /** Description of the board in HTML format. */
  description_html?: string;
  /** Grid layout information for arranging buttons. */
  grid?: Grid;
  /** List of images used in the board. */
  images?: Image[];
  /** List of sounds used in the board. */
  sounds?: Sound[];
  /** Licensing information for the board. */
  license?: License;
  /** String translations for multiple locales. */
  strings?: Strings;
}

/**
 * Manifest file in an .obz package.
 */
export interface Manifest {
  /** Format version of the Open Board Format, e.g., 'open-board-0.1'. */
  format: FormatVersion;
  /** Path to the root board within the .obz package. */
  root: string;
  /** Mapping of IDs to paths for boards, images, and sounds. */
  paths: {
    /** Mapping of board IDs to their file paths. */
    boards: Record<UUID, string>;
    /** Mapping of image IDs to their file paths. */
    images: Record<UUID, string>;
    /** Mapping of sound IDs to their file paths. */
    sounds: Record<UUID, string>;
  };
}
