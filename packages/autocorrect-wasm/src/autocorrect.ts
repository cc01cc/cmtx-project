import {
    format as wasmFormat,
    formatFor as wasmFormatFor,
    lintFor as wasmLintFor,
    loadConfig as wasmLoadConfig,
    Ignorer as WasmIgnorer,
} from "./index.js";

/**
 * Lint result for a single file
 */
export interface LintResult {
    /** File path */
    filepath: string;
    /** List of lint issues */
    lines: Array<{
        /** Line number */
        l: number;
        /** Column number */
        c: number;
        /** New text */
        new: string;
        /** Old text */
        old: string;
        /** Severity level */
        severity: number;
    }>;
    /** Error message if any */
    error: string;
}

/**
 * Format plain text with AutoCorrect rules.
 *
 * @param text - The text to format
 * @returns The formatted text
 *
 * @example
 * ```typescript
 * import { formatText } from "@cmtx/autocorrect-wasm";
 *
 * const result = formatText("学习如何用Rust构建Application");
 * console.log(result); // "学习如何用 Rust 构建 Application"
 * ```
 */
export function formatText(text: string): string {
    return wasmFormat(text);
}

/**
 * Format content for a specific file type.
 *
 * @param text - The text to format
 * @param fileType - The file type (extension or filename)
 * @returns The formatted text
 *
 * @example
 * ```typescript
 * import { formatForType } from "@cmtx/autocorrect-wasm";
 *
 * const result = formatForType("# Hello World", "markdown");
 * console.log(result); // Formatted markdown content
 * ```
 */
export function formatForType(text: string, fileType: string): string {
    const result = wasmFormatFor(text, fileType);
    // wasm-bindgen returns JsValue, convert to string
    return typeof result === "string" ? result : JSON.stringify(result);
}

/**
 * Lint content for a specific file type.
 *
 * @param text - The text to lint
 * @param fileType - The file type (extension or filename)
 * @returns Lint result with issues found
 *
 * @example
 * ```typescript
 * import { lintForType } from "@cmtx/autocorrect-wasm";
 *
 * const result = lintForType("学习如何用Rust构建Application", "markdown");
 * console.log(result.lines); // Array of lint issues
 * ```
 */
export function lintForType(text: string, fileType: string): LintResult {
    const result = wasmLintFor(text, fileType);
    return typeof result === "string" ? JSON.parse(result) : result;
}

/**
 * Load AutoCorrect configuration from JSON string.
 *
 * @param configJson - JSON string containing configuration
 * @returns The loaded configuration object
 *
 * @example
 * ```typescript
 * import { loadConfig } from "@cmtx/autocorrect-wasm";
 *
 * const config = loadConfig('{"rules": {"space_between_chinese_and_latin": true}}');
 * ```
 */
export function loadAutoCorrectConfig(configJson: string): unknown {
    return wasmLoadConfig(configJson);
}

/**
 * Create an Ignorer instance for .gitignore-style path matching.
 *
 * @param workDir - The working directory
 * @returns An Ignorer instance
 *
 * @example
 * ```typescript
 * import { createIgnorer } from "@cmtx/autocorrect-wasm";
 *
 * const ignorer = createIgnorer("/path/to/project");
 * console.log(ignorer.isIgnored("node_modules/foo")); // true or false
 * ```
 */
export function createIgnorer(workDir: string): {
    isIgnored: (path: string) => boolean;
} {
    return new WasmIgnorer(workDir);
}
