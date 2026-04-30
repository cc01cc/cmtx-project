import type MarkdownIt from "markdown-it";

import { PresignedUrlHandler } from "./handler.js";
import type { PresignedUrlPluginOptions } from "./types.js";

const TOKEN_TYPES = {
    CMTX_PRESIGNED_IMAGE: "cmtx_presigned_image",
} as const;

/**
 * Markdown-it plugin for presigned URL handling
 * @param md - Markdown-it instance
 * @param options - Plugin options
 * @public
 */
export function presignedUrlPlugin(md: MarkdownIt, options: PresignedUrlPluginOptions): void {
    options.logger?.info("开始添加预签名 URL 标记");
    options.logger?.info(
        `配置详情：domains=${options.domains.join(", ")}, imageFormat=${options.imageFormat}`,
    );

    const handler = new PresignedUrlHandler(md, options);

    md.inline.ruler.before("text", "cmtx_presigned_image_inline", (state, silent) => {
        return handler.handleInlineHtmlImageRule(state, silent);
    });

    const defaultImageRule = md.renderer.rules.image;
    md.renderer.rules.image = (tokens, idx, opts, env, self) => {
        return handler.handleMarkdownImageRenderer(tokens, idx, opts, env, self, defaultImageRule);
    };

    const defaultHtmlInlineRule = md.renderer.rules.html_inline;
    md.renderer.rules.html_inline = (tokens, idx, opts, env, self) => {
        return handler.handleHtmlInlineImageRenderer(
            tokens,
            idx,
            opts,
            env,
            self,
            defaultHtmlInlineRule,
        );
    };

    const defaultHtmlBlockRule = md.renderer.rules.html_block;
    options.logger?.info(`defaultHtmlBlockRule 类型: ${typeof defaultHtmlBlockRule}`);
    if (defaultHtmlBlockRule) {
        md.renderer.rules.html_block = (tokens, idx, opts, env, self) => {
            options.logger?.info(`html_block renderer 被调用, token.type: ${tokens[idx]?.type}`);
            return handler.handleHtmlBlockImageRenderer(
                tokens,
                idx,
                opts,
                env,
                self,
                defaultHtmlBlockRule,
            );
        };
    } else {
        options.logger?.warn("defaultHtmlBlockRule 为 undefined，html_block 规则未被覆盖");
    }

    md.renderer.rules[TOKEN_TYPES.CMTX_PRESIGNED_IMAGE] = (tokens, idx, opts, env, self) => {
        return handler.handleCustomImageRenderer(tokens, idx, opts, env, self);
    };

    options.logger?.info("预签名 URL 标记添加完成");
}
