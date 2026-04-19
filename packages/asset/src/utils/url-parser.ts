/**
 * URL 解析器
 *
 * @module utils/url-parser
 * @description
 * 解析 Markdown 中的图片 URL，识别属于特定存储的 URL。
 *
 * @remarks
 * ## 功能
 * - 从 Markdown 提取所有图片 URL
 * - 根据域名过滤属于特定存储的 URL
 * - 支持自定义域名匹配
 * - 支持签名 URL 识别
 */

import { filterImagesInText } from '@cmtx/core';
import { isStorageUrl } from './storage-url-detector.js';

/**
 * 图片信息
 */
interface ImageInfo {
    /** 图片地址 */
    src: string;
    /** 替代文本 */
    alt?: string;
    /** 标题 */
    title?: string;
}

/**
 * URL 解析结果
 */
export interface ParsedUrl {
    /** 原始 URL */
    originalUrl: string;

    /** 解析后的 URL 对象 */
    url: URL;

    /** 文件名 */
    fileName: string;

    /** 文件扩展名 */
    extension: string;

    /** 是否匹配源存储 */
    isMatch: boolean;

    /** 远程路径（相对于存储根） */
    remotePath?: string;
}

/**
 * URL 解析器配置
 */
export interface UrlParserConfig {
    /** 源存储域名列表 */
    sourceDomains: string[];

    /** 是否包含子域名 */
    includeSubdomains?: boolean;

    /** 自定义匹配函数 */
    customMatcher?: (url: string) => boolean;
}

/**
 * URL 解析器
 */
export class UrlParser {
    private readonly config: UrlParserConfig;

    constructor(config: UrlParserConfig) {
        this.config = {
            includeSubdomains: true,
            ...config,
        };
    }

    /**
     * 从 Markdown 文本中提取图片 URL
     * @param markdown - Markdown 文本
     * @returns 图片信息列表
     */
    extractImageUrls(markdown: string): ImageInfo[] {
        // 使用 filterImagesInText 提取所有远程图片
        const images = filterImagesInText(markdown, {
            mode: 'sourceType',
            value: 'web',
        });
        return images.map((img) => ({
            src: img.src,
            alt: img.alt,
            title: img.title,
        }));
    }

    /**
     * 解析并过滤属于源存储的 URL
     * @param markdown - Markdown 文本
     * @returns 解析后的 URL 列表
     */
    parseSourceUrls(markdown: string): ParsedUrl[] {
        const images = this.extractImageUrls(markdown);
        const results: ParsedUrl[] = [];

        for (const image of images) {
            const parsed = this.parseUrl(image.src);
            if (parsed) {
                results.push(parsed);
            }
        }

        return results;
    }

    /**
     * 解析单个 URL
     * @param urlString - URL 字符串
     * @returns 解析结果（如果 URL 无效则返回 null）
     */
    parseUrl(urlString: string): ParsedUrl | null {
        try {
            const url = new URL(urlString);
            const fileName = this.extractFileName(url);
            const extension = this.extractExtension(url);
            const isMatch = this.isSourceUrl(urlString);
            const remotePath = isMatch ? this.extractRemotePath(url) : undefined;

            return {
                originalUrl: urlString,
                url,
                fileName,
                extension,
                isMatch,
                remotePath,
            };
        } catch {
            // URL 解析失败
            return null;
        }
    }

    /**
     * 检查 URL 是否属于源存储
     * @param urlString - URL 字符串
     * @returns 是否匹配
     *
     * @remarks
     * 使用 storage-url-detector 自动识别云存储 URL，支持：
     * - 阿里云 OSS
     * - 腾讯云 COS
     * - AWS S3
     * - 自定义域名
     */
    isSourceUrl(urlString: string): boolean {
        // 自定义匹配函数优先
        if (this.config.customMatcher) {
            return this.config.customMatcher(urlString);
        }

        // 使用 storage-url-detector 自动识别云存储 URL
        return isStorageUrl(urlString, {
            customDomains: this.config.sourceDomains,
        });
    }

    /**
     * 提取文件名
     * @param url - URL 对象
     * @returns 文件名
     */
    private extractFileName(url: URL): string {
        const pathname = url.pathname;
        const baseName = pathname.split('/').pop() || 'unknown';

        // 移除查询参数（签名 URL 中的参数）
        return baseName.split('?')[0];
    }

    /**
     * 提取扩展名
     * @param url - URL 对象
     * @returns 扩展名（包含点号）
     */
    private extractExtension(url: URL): string {
        const fileName = this.extractFileName(url);
        const match = fileName.match(/\.[a-zA-Z0-9]+$/);
        return match ? match[0].toLowerCase() : '';
    }

    /**
     * 提取远程路径
     * @param url - URL 对象
     * @returns 远程路径
     */
    private extractRemotePath(url: URL): string {
        // 移除开头的斜杠
        return url.pathname.replace(/^\//, '');
    }
}

/**
 * 创建 URL 解析器
 * @param config - 解析器配置
 * @returns UrlParser 实例
 */
export function createUrlParser(config: UrlParserConfig): UrlParser {
    return new UrlParser(config);
}

/**
 * 从 URL 提取文件名
 * @param urlString - URL 字符串
 * @returns 文件名
 */
export function extractFileNameFromUrl(urlString: string): string {
    try {
        const url = new URL(urlString);
        return url.pathname.split('/').pop() || 'unknown';
    } catch {
        // 如果 URL 解析失败，尝试从字符串提取
        const parts = urlString.split('/');
        return parts[parts.length - 1].split('?')[0] || 'unknown';
    }
}

/**
 * 从 URL 提取扩展名
 * @param urlString - URL 字符串
 * @returns 扩展名（小写，不包含点号）
 */
export function extractExtensionFromUrl(urlString: string): string {
    const fileName = extractFileNameFromUrl(urlString);
    const match = fileName.match(/\.([a-zA-Z0-9]+)$/);
    return match ? match[1].toLowerCase() : '';
}

/**
 * 规范化 URL（移除查询参数和哈希）
 * @param urlString - URL 字符串
 * @returns 规范化后的 URL
 */
export function normalizeUrl(urlString: string): string {
    try {
        const url = new URL(urlString);
        return `${url.protocol}//${url.host}${url.pathname}`;
    } catch {
        return urlString;
    }
}
