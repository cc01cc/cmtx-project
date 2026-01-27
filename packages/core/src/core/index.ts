/**
 * Core Layer Public API
 * 
 * This module exports all core functionality organized by purpose.
 */

// Type definitions
export type {
  ImageSourceType,
  ParsedImage,
  ImageMatch,
  ExtractOptionsInternal,
  ImageReferenceLocation,
  ImageReferenceDetail,
  CoreReplacementDetail,
  CoreReplaceResult,
  LogLevel,
  LoggerCallback,
} from "./types.js";

// Utilities
export {
  IMAGE_PATTERN,
  TITLE_PATTERN,
  normalizePath,
  isWebSource,
  resolveImagePath,
  getLineAndColumn,
} from "./utils.js";

// Parsing functions
export {
  parseMarkdownImages,
  extractImagesInternal,
} from "./parser.js";

// Query functions
export {
  extractSingleImageLocations,
  isImageReferencedInFileInternal,
  findFilesReferencingImageInternal,
  getImageReferenceDetailsInternal,
} from "./query.js";

// File operations
export {
  extractImagesFromFileInternal,
  extractImagesFromDirectoryInternal,
} from "./fileOps.js";

// Modification functions (delete & replace)
export {
  validatePathWithinRoot,
  deleteFileInternal,
  safeDeleteFileInternal,
  replaceImageInFileInternal,
  replaceImageInDirectoryInternal,
} from "./modifier.js";
