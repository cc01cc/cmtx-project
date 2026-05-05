import type MarkdownIt from "markdown-it";

import type {
    InlineStateLike,
    Logger,
    MarkdownRenderRule,
    PresignedUrlPluginOptions,
} from "./types.js";
import { DomainMatcher } from "./utils/domain-matcher.js";
import { FormatValidator } from "./utils/format-validator.js";

const TOKEN_TYPES = {
    CMTX_PRESIGNED_IMAGE: "cmtx_presigned_image",
} as const;

let previewRefreshScheduled = false;

function scheduleRefresh(onSignedUrlReady?: () => void): void {
    if (previewRefreshScheduled || !onSignedUrlReady) {
        return;
    }

    previewRefreshScheduled = true;
    setTimeout(() => {
        try {
            onSignedUrlReady();
        } finally {
            previewRefreshScheduled = false;
        }
    }, 0);
}

/**
 * Handler for presigned URL processing in markdown-it
 * @public
 */
export class PresignedUrlHandler {
    private readonly domainMatcher: DomainMatcher;
    private readonly formatValidator: FormatValidator;
    private readonly md: MarkdownIt;
    private readonly options: PresignedUrlPluginOptions;
    private readonly logger?: Logger;

    constructor(md: MarkdownIt, options: PresignedUrlPluginOptions) {
        this.md = md;
        this.options = options;
        this.logger = options.logger;
        this.domainMatcher = new DomainMatcher(options.domains, this.logger);
        this.formatValidator = new FormatValidator(options.imageFormat);
    }

    private isEnabled(): boolean {
        if (this.options.enabled === undefined) return true;
        if (typeof this.options.enabled === "function") return this.options.enabled();
        return this.options.enabled;
    }

    private renderPresignedToken(
        tokens: ReturnType<MarkdownIt["parse"]>,
        idx: number,
        options: MarkdownIt["options"],
        env: unknown,
        self: MarkdownIt["renderer"],
    ): string {
        const customRule = this.md.renderer.rules[TOKEN_TYPES.CMTX_PRESIGNED_IMAGE];
        if (customRule) {
            return customRule(tokens, idx, options, env, self);
        }

        return self.renderToken(tokens, idx, options);
    }

    handleInlineHtmlImageRule(state: InlineStateLike, silent: boolean): boolean {
        if (!this.isEnabled()) return false;

        this.logger?.info(
            `[DIAG] handleInlineHtmlImageRule 被调用, silent: ${silent}, pos: ${state.pos}`,
        );
        this.logger?.info(`[DIAG] state.src: ${state.src?.substring(state.pos, state.pos + 100)}`);

        if (!this.formatValidator.shouldProcessHtml()) {
            this.logger?.info("[DIAG] shouldProcessHtml 返回 false");
            return false;
        }

        const pos = state.pos;
        const max = state.posMax;

        if (isInComment(state.src, pos)) {
            this.logger?.info("[DIAG] 在注释中，跳过");
            return false;
        }

        if (pos + 4 >= max) {
            this.logger?.info("[DIAG] 剩余长度不足");
            return false;
        }

        const tagStart = state.src.slice(pos, pos + 4).toLowerCase();
        this.logger?.info(`[DIAG] tagStart: ${tagStart}`);
        if (tagStart !== "<img") {
            return false;
        }

        let end = pos;
        while (end < max && state.src.charCodeAt(end) !== 0x3e) {
            end++;
        }
        if (end >= max) {
            this.logger?.info("[DIAG] 未找到结束符 >");
            return false;
        }

        const tagContent = state.src.slice(pos, end + 1);
        this.logger?.info(`[DIAG] tagContent: ${tagContent}`);

        const imgMatch = tagContent.match(/^<img\s+[^>]*src=["']([^"']+)["'][^>]*>$/i);
        if (!imgMatch) {
            this.logger?.info("[DIAG] 正则匹配失败");
            return false;
        }

        this.logger?.info(`[DIAG] 提取到 src: ${imgMatch[1]}`);
        if (!this.domainMatcher.matches(imgMatch[1])) {
            this.logger?.info("[DIAG] 域名不匹配");
            return false;
        }

        if (!silent) {
            const token = state.push(TOKEN_TYPES.CMTX_PRESIGNED_IMAGE, "", 0);
            token.attrPush(["src", imgMatch[1]]);
            token.content = tagContent;
            this.logger?.info(`[DIAG] 处理 inline HTML 图片，创建自定义 token: ${imgMatch[1]}`);
        }

        state.pos = end + 1;
        return true;
    }

    // eslint-disable-next-line max-params
    handleMarkdownImageRenderer(
        tokens: ReturnType<MarkdownIt["parse"]>,
        idx: number,
        options: MarkdownIt["options"],
        env: unknown,
        self: MarkdownIt["renderer"],
        defaultImageRule: MarkdownRenderRule | undefined,
    ): string {
        if (!this.isEnabled()) {
            return defaultImageRule
                ? defaultImageRule(tokens, idx, options, env, self)
                : self.renderToken(tokens, idx, options);
        }

        const token = tokens[idx];
        this.logger?.debug(`处理 Markdown 图片 token`);

        const src = token.attrGet("src");
        if (
            this.formatValidator.shouldProcessMarkdown() &&
            src &&
            this.domainMatcher.matches(src)
        ) {
            this.logger?.debug(`Markdown 图片需要处理，src: ${src}`);
            token.type = TOKEN_TYPES.CMTX_PRESIGNED_IMAGE;
            return this.renderPresignedToken(tokens, idx, options, env, self);
        }

        return defaultImageRule
            ? defaultImageRule(tokens, idx, options, env, self)
            : self.renderToken(tokens, idx, options);
    }

    // eslint-disable-next-line max-params
    handleHtmlInlineImageRenderer(
        tokens: ReturnType<MarkdownIt["parse"]>,
        idx: number,
        options: MarkdownIt["options"],
        env: unknown,
        self: MarkdownIt["renderer"],
        defaultHtmlInlineRule: MarkdownRenderRule | undefined,
    ): string {
        if (!this.isEnabled()) {
            return defaultHtmlInlineRule
                ? defaultHtmlInlineRule(tokens, idx, options, env, self)
                : self.renderToken(tokens, idx, options);
        }

        const token = tokens[idx];
        this.logger?.info(`[DIAG] handleHtmlInlineImageRenderer 被调用`);
        this.logger?.info(`[DIAG] token.content: ${token.content?.substring(0, 200)}`);

        if (this.formatValidator.shouldProcessHtml() && isImageTag(token.content)) {
            const src = extractSrcFromImgTag(token.content);
            this.logger?.info(`[DIAG] 提取到 src: ${src}`);
            if (src && this.domainMatcher.matches(src)) {
                this.logger?.info(`[DIAG] HTML 内联图片需要处理，src: ${src}`);
                if (!token.attrs) {
                    token.attrs = [];
                }
                token.attrPush(["src", src]);
                return this.renderPresignedToken(tokens, idx, options, env, self);
            }
        }

        return defaultHtmlInlineRule
            ? defaultHtmlInlineRule(tokens, idx, options, env, self)
            : self.renderToken(tokens, idx, options);
    }

    handleHtmlBlockImageRenderer(
        tokens: ReturnType<MarkdownIt["parse"]>,
        idx: number,
        options: MarkdownIt["options"],
        env: unknown,
        self: MarkdownIt["renderer"],
        defaultHtmlBlockRule: MarkdownRenderRule,
    ): string {
        if (!this.isEnabled()) {
            return defaultHtmlBlockRule(tokens, idx, options, env, self);
        }

        const token = tokens[idx];
        this.logger?.info(`[DIAG] handleHtmlBlockImageRenderer 被调用`);
        this.logger?.info(`[DIAG] token.content: ${token.content?.substring(0, 200)}`);
        this.logger?.info(`[DIAG] shouldProcessHtml: ${this.formatValidator.shouldProcessHtml()}`);
        this.logger?.info(`[DIAG] isImageTag: ${isImageTag(token.content)}`);

        if (token.content.trim().includes("<!--") || token.content.trim().includes("-->")) {
            this.logger?.info("[DIAG] 跳过注释中的 HTML 块");
            return defaultHtmlBlockRule(tokens, idx, options, env, self);
        }

        if (!this.formatValidator.shouldProcessHtml() || !isImageTag(token.content)) {
            this.logger?.info("[DIAG] 不满足处理条件，使用默认规则");
            return defaultHtmlBlockRule(tokens, idx, options, env, self);
        }

        const imgTags = extractAllImgTags(token.content);
        this.logger?.info(`[DIAG] 提取到 ${imgTags.length} 个图片标签`);
        if (imgTags.length > 0) {
            for (const imgTag of imgTags) {
                this.logger?.info(`[DIAG] 检查图片: ${imgTag.src}`);
                const matches = this.domainMatcher.matches(imgTag.src);
                this.logger?.info(`[DIAG] 域名匹配结果: ${matches}`);
                if (matches) {
                    this.logger?.info(`[DIAG] HTML 块级图片需要处理，src: ${imgTag.src}`);
                    if (!token.attrs) {
                        token.attrs = [];
                    }
                    token.attrPush(["src", imgTag.src]);
                }
            }
        }

        return this.renderPresignedToken(tokens, idx, options, env, self);
    }

    handleCustomImageRenderer(
        tokens: ReturnType<MarkdownIt["parse"]>,
        idx: number,
        options: MarkdownIt["options"],
        _env: unknown,
        self: MarkdownIt["renderer"],
    ): string {
        if (!this.isEnabled()) {
            const token = tokens[idx];
            if (token.content && isImageTag(token.content)) {
                return token.content;
            }
            return self.renderToken(tokens, idx, options);
        }

        const token = tokens[idx];
        this.logger?.info(`[DIAG] handleCustomImageRenderer 被调用`);
        this.logger?.info(`[DIAG] token.content: ${token.content?.substring(0, 200)}`);
        const isHtmlImage = token.content && isImageTag(token.content);
        this.logger?.info(`[DIAG] isHtmlImage: ${isHtmlImage}`);

        if (isHtmlImage) {
            // Handle multiple images in the same HTML block
            let result = token.content;
            const imgTags = extractAllImgTags(token.content);
            this.logger?.info(`[DIAG] 提取到 ${imgTags.length} 个图片标签`);

            for (const imgTag of imgTags) {
                this.logger?.info(`[DIAG] 处理图片: ${imgTag.src}`);
                if (this.domainMatcher.matches(imgTag.src)) {
                    const signedUrl = this.getSignedUrl(imgTag.src);
                    this.logger?.info(`[DIAG] signedUrl: ${signedUrl ? "有" : "无"}`);
                    if (signedUrl) {
                        result = replaceSrcInImgTag(result, imgTag.src, signedUrl);
                    }
                }
            }

            return result;
        }

        // Handle Markdown images (single image)
        const src = token.attrGet("src");
        this.logger?.info(`[DIAG] Markdown 图片 src: ${src}`);
        const signedUrl = this.getSignedUrl(src);
        if (src && signedUrl) {
            token.attrSet("src", signedUrl);
        }

        return self.renderToken(tokens, idx, options);
    }

    private getSignedUrl(src: string | null): string | null {
        if (!src) {
            return null;
        }

        if (!this.domainMatcher.matches(src)) {
            this.logger?.debug(`域名不匹配，跳过预签名处理：${src}`);
            return null;
        }

        this.logger?.info(`为图片添加预签名标记，src: ${src}`);

        const cachedUrl = this.options.getSignedUrl(src);
        if (cachedUrl) {
            if (cachedUrl === src) {
                this.logger?.warn(`签名未生效，使用原始 URL 缓存回退：${src}`);
            } else {
                this.logger?.info(`使用缓存的预签名 URL: ${src} -> ${cachedUrl}`);
            }
            return cachedUrl;
        }

        if (this.options.requestSignedUrl) {
            this.logger?.info(`触发异步预签名 URL 请求：${src}`);

            this.options
                .requestSignedUrl(src)
                .then((signedUrl: string) => {
                    if (signedUrl === src) {
                        this.logger?.warn(`预签名未生效，已回退原始 URL：${src}`);
                    } else {
                        this.logger?.info(`预签名 URL 生成成功：${src} -> ${signedUrl}`);
                    }
                    scheduleRefresh(this.options.onSignedUrlReady);
                })
                .catch((err: Error) => {
                    this.logger?.error(`预签名 URL 生成失败：${err}`);
                    scheduleRefresh(this.options.onSignedUrlReady);
                });
        }

        return null;
    }
}

/**
 * Check if content is an image tag
 * @param content - Content to check
 * @returns True if content is an image tag
 * @internal
 */
function isImageTag(content: string): boolean {
    return /<img\s+/i.test(content);
}

/**
 * Extract src attribute from img tag
 * @param content - HTML img tag content
 * @returns The src URL or null if not found
 * @internal
 */
function extractSrcFromImgTag(content: string): string | null {
    const match = content.match(/<img\s+[^>]*src=["']([^"']+)["'][^>]*>/i);
    return match ? match[1] : null;
}

/**
 * Extract all img tags from content
 * @param content - HTML content to parse
 * @returns Array of img tag objects with tag and src properties
 * @internal
 */
function extractAllImgTags(content: string): Array<{ tag: string; src: string }> {
    const imgTags: Array<{ tag: string; src: string }> = [];
    const imgRegex = /<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi;
    let match: RegExpExecArray | null;

    while (true) {
        match = imgRegex.exec(content);
        if (match === null) {
            break;
        }
        imgTags.push({
            tag: match[0],
            src: match[1],
        });
    }

    return imgTags;
}

/**
 * Check if position is inside an HTML comment
 * @param src - Source string
 * @param pos - Position to check
 * @returns True if position is inside a comment
 * @internal
 */
function isInComment(src: string, pos: number): boolean {
    let commentStart = -1;
    let commentEnd = -1;

    let searchPos = pos;
    while (searchPos >= 3) {
        if (src.slice(searchPos - 3, searchPos + 1) === "<!--") {
            commentStart = searchPos - 3;
            break;
        }
        searchPos--;
    }

    if (commentStart === -1) {
        return false;
    }

    searchPos = pos;
    while (searchPos <= src.length - 3) {
        if (src.slice(searchPos, searchPos + 3) === "-->") {
            commentEnd = searchPos + 2;
            break;
        }
        searchPos++;
    }

    return commentStart !== -1 && commentEnd !== -1 && commentStart < pos && pos < commentEnd;
}

/**
 * Replace src attribute in img tag
 * @param content - HTML content
 * @param originalSrc - Original src URL
 * @param newSrc - New src URL to replace with
 * @returns Modified content with replaced src
 * @internal
 */
function replaceSrcInImgTag(content: string, originalSrc: string, newSrc: string): string {
    return content.replace(
        new RegExp(`src=["'](${escapeRegExp(originalSrc)})["']`, "g"),
        `src="${newSrc}"`,
    );
}

/**
 * Escape special regex characters in a string
 * @param str - String to escape
 * @returns Escaped string safe for regex use
 * @internal
 */
function escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
