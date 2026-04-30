import type MarkdownIt from "markdown-it";

export interface Logger {
    debug(message: string, ...args: unknown[]): void;
    info(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
}

export interface PresignedUrlPluginOptions {
    domains: string[];
    imageFormat: "markdown" | "html" | "all";
    logger?: Logger;
    getSignedUrl: (src: string) => string | null;
    requestSignedUrl?: (src: string) => Promise<string>;
    onSignedUrlReady?: () => void;
}

export type PresignedUrlPlugin = (md: MarkdownIt, options: PresignedUrlPluginOptions) => void;

export type MarkdownToken = ReturnType<MarkdownIt["parse"]>[number];
export type MarkdownTokens = MarkdownToken[];
export type MarkdownOptions = MarkdownIt["options"];
export type MarkdownRenderer = MarkdownIt["renderer"];
export type MarkdownRenderRule = (
    tokens: MarkdownTokens,
    idx: number,
    options: MarkdownOptions,
    env: unknown,
    self: MarkdownRenderer,
) => string;

export interface InlineStateLike {
    src: string;
    pos: number;
    posMax: number;
    push(type: string, tag: string, nesting: MarkdownToken["nesting"]): MarkdownToken;
}
