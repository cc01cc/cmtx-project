/**
 * URL 匹配器
 *
 * @module download/url-matcher
 * @description
 * 从 Markdown 中提取图片 URL，并根据域名进行过滤。
 */

import { filterImagesInText } from "@cmtx/core";
import type { ParsedUrlInfo } from "./types.js";

/**
 * URL 匹配器配置
 */
export interface UrlMatcherConfig {
    /** 只匹配指定域名 */
    domain?: string;

    /** 是否包含子域名 */
    includeSubdomains?: boolean;
}

/**
 * URL 匹配器
 */
export class UrlMatcher {
    private readonly config: UrlMatcherConfig;

    constructor(config: UrlMatcherConfig = {}) {
        this.config = {
            includeSubdomains: true,
            ...config,
        };
    }

    /**
     * 从 Markdown 文本中提取并过滤图片 URL
     *
     * @param markdown - Markdown 文本
     * @returns 解析后的 URL 信息列表
     */
    extractUrls(markdown: string): ParsedUrlInfo[] {
        // 提取所有 web 图片
        const images = filterImagesInText(markdown, {
            mode: "sourceType",
            value: "web",
        });

        return images
            .map((img) => this.parseUrl(img.src))
            .filter((info) => info !== null) as ParsedUrlInfo[];
    }

    /**
     * 解析单个 URL
     *
     * @param url - 图片 URL
     * @returns 解析后的 URL 信息，无效 URL 返回 null
     */
    parseUrl(url: string): ParsedUrlInfo | null {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const lastSlash = pathname.lastIndexOf("/");
            const fileName = lastSlash >= 0 ? pathname.slice(lastSlash + 1) : pathname;

            // 分离文件名和扩展名
            const lastDot = fileName.lastIndexOf(".");
            const baseName = lastDot > 0 ? fileName.slice(0, lastDot) : fileName || "image";
            const ext = lastDot > 0 ? fileName.slice(lastDot) : ".bin";

            // 检查域名匹配
            const isMatch = this.matchDomain(urlObj.hostname);

            // 提取远程路径
            const remotePath = pathname.startsWith("/") ? pathname.slice(1) : pathname;

            return {
                originalUrl: url,
                url: urlObj,
                baseName,
                ext,
                isMatch,
                remotePath,
            };
        } catch {
            return null;
        }
    }

    /**
     * 检查域名是否匹配
     *
     * @param hostname - 待检查的主机名
     * @returns 是否匹配
     */
    private matchDomain(hostname: string): boolean {
        if (!this.config.domain) {
            return true;
        }

        if (this.config.includeSubdomains) {
            return hostname === this.config.domain || hostname.endsWith(`.${this.config.domain}`);
        }

        return hostname === this.config.domain;
    }
}

/**
 * 创建 URL 匹配器
 *
 * @param config - 配置
 * @returns UrlMatcher 实例
 */
export function createUrlMatcher(config: UrlMatcherConfig = {}): UrlMatcher {
    return new UrlMatcher(config);
}
