/**
 * URL 存在性检测
 *
 * @module utils/url-existence-check
 * @description
 * 通过 HTTP 请求检测 URL 是否可访问，支持从文本中提取 URL 并批量检测。
 *
 * @remarks
 * ## 功能
 * - 使用 HTTP HEAD 请求检测 URL 可达性（高效，不下载响应体）
 * - HEAD 不支持时自动降级为 GET + Range: bytes=0-0
 * - 支持超时控制、自定义请求头、重定向策略
 * - 支持批量检测，带并发控制
 * - 支持从 Markdown/HTML/纯文本中提取 URL 并检测
 *
 * ## 使用场景
 * - 发布前校验 Markdown 中引用的远程图片 URL 是否有效
 * - 图片上传/转移后确认新 URL 可访问
 * - 批量死链检测
 * - 从文本中提取 URL 并一键检测可达性
 */

import pLimit from "p-limit";

/**
 * URL 存在性检测选项
 *
 * @public
 */
export interface UrlExistenceCheckOptions {
    /** 请求超时（毫秒），默认 5000 */
    timeout?: number;
    /** 自定义请求头 */
    headers?: Record<string, string>;
    /** 是否跟随重定向，默认 true */
    followRedirects?: boolean;
    /** 自定义 fetch 函数（用于测试或特殊环境） */
    fetch?: typeof globalThis.fetch;
}

/**
 * URL 存在性检测结果
 *
 * @public
 */
export interface UrlExistenceResult {
    /** URL 是否可访问 */
    exists: boolean;
    /** HTTP 状态码（网络错误时为 undefined） */
    statusCode?: number;
    /** 错误信息（网络错误时） */
    error?: string;
}

/**
 * 批量检测选项
 *
 * @public
 */
export interface UrlExistenceBatchOptions extends UrlExistenceCheckOptions {
    /** 并发数，默认 5 */
    concurrency?: number;
    /** 单个 URL 检测失败时是否继续，默认 true */
    continueOnError?: boolean;
}

/**
 * 批量检测结果
 *
 * @public
 */
export interface UrlExistenceBatchResult {
    /** 总数 */
    total: number;
    /** 存在的数量 */
    existsCount: number;
    /** 不存在的数量 */
    notExistsCount: number;
    /** 失败的数量（网络错误等） */
    failedCount: number;
    /** 各 URL 检测结果 */
    results: Array<UrlExistenceResult & { url: string }>;
}

/** 默认请求超时（毫秒） */
const DEFAULT_TIMEOUT = 5000;

/** 默认并发数 */
const DEFAULT_CONCURRENCY = 5;

/**
 * 使用 fetch API 发送请求并返回结果
 *
 * @internal
 */
async function fetchWithTimeout(
    url: string,
    options: {
        method: string;
        signal: AbortSignal;
        redirect: RequestRedirect;
        headers?: Record<string, string>;
    },
    fetchFn: typeof globalThis.fetch,
): Promise<{ status: number; ok: boolean }> {
    const response = await fetchFn(url, options);
    return { status: response.status, ok: response.ok };
}

/**
 * 降级为 GET 请求（带 Range header）
 *
 * @internal
 */
async function fallbackGetRequest(
    url: string,
    signal: AbortSignal,
    headers: Record<string, string> | undefined,
    fetchFn: typeof globalThis.fetch,
): Promise<UrlExistenceResult> {
    try {
        const result = await fetchWithTimeout(
            url,
            {
                method: "GET",
                signal,
                redirect: "follow",
                headers: { ...headers, Range: "bytes=0-0" },
            },
            fetchFn,
        );
        return { exists: result.ok || result.status === 206, statusCode: result.status };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { exists: false, error: message };
    }
}

/**
 * 检测单个 URL 是否存在
 *
 * @param url - 要检测的 URL
 * @param options - 检测选项
 * @returns 检测结果
 *
 * @example
 * ```typescript
 * import { checkUrlExists } from '@cmtx/asset/utils/url-existence-check';
 *
 * const result = await checkUrlExists('https://example.com/image.png');
 * if (result.exists) {
 *     console.log(`URL exists (HTTP ${result.statusCode})`);
 * } else {
 *     console.log(`URL not found: ${result.error}`);
 * }
 * ```
 *
 * @public
 */
export async function checkUrlExists(
    url: string,
    options?: UrlExistenceCheckOptions,
): Promise<UrlExistenceResult> {
    const timeout = options?.timeout ?? DEFAULT_TIMEOUT;
    const fetchFn = options?.fetch ?? globalThis.fetch;
    const headers = options?.headers;
    const redirect = options?.followRedirects === false ? "manual" : "follow";

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const result = await fetchWithTimeout(
            url,
            {
                method: "HEAD",
                signal: controller.signal,
                redirect,
                headers,
            },
            fetchFn,
        );

        // HEAD 不支持时降级为 GET
        if (result.status === 405 || result.status === 501) {
            return await fallbackGetRequest(url, controller.signal, headers, fetchFn);
        }

        return { exists: result.ok, statusCode: result.status };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { exists: false, error: message };
    } finally {
        clearTimeout(timeoutId);
    }
}

/**
 * 批量检测多个 URL 是否存在
 *
 * @param urls - 要检测的 URL 列表
 * @param options - 检测选项
 * @returns 批量检测结果
 *
 * @example
 * ```typescript
 * import { checkUrlExistsBatch } from '@cmtx/asset/utils/url-existence-check';
 *
 * const result = await checkUrlExistsBatch([
 *     'https://example.com/image1.png',
 *     'https://example.com/image2.png',
 * ], { concurrency: 3 });
 *
 * console.log(`${result.existsCount}/${result.total} URLs exist`);
 * ```
 *
 * @public
 */
export async function checkUrlExistsBatch(
    urls: string[],
    options?: UrlExistenceBatchOptions,
): Promise<UrlExistenceBatchResult> {
    const concurrency = options?.concurrency ?? DEFAULT_CONCURRENCY;
    const continueOnError = options?.continueOnError !== false;
    const limit = pLimit(concurrency);

    const results: Array<UrlExistenceResult & { url: string }> = [];
    let existsCount = 0;
    let notExistsCount = 0;
    let failedCount = 0;
    let aborted = false;

    const tasks = urls.map((url) =>
        limit(async () => {
            if (aborted) return;

            const result = await checkUrlExists(url, options);
            const entry = { ...result, url };
            results.push(entry);

            if (result.error) {
                failedCount++;
                if (!continueOnError) {
                    aborted = true;
                    throw new Error(result.error);
                }
            } else if (result.exists) {
                existsCount++;
            } else {
                notExistsCount++;
            }
        }),
    );

    try {
        await Promise.all(tasks);
    } catch (error) {
        if (!continueOnError) {
            throw error;
        }
    }

    return {
        total: urls.length,
        existsCount,
        notExistsCount,
        failedCount,
        results,
    };
}

/**
 * 默认 URL 匹配正则
 *
 * 匹配顺序：Markdown 语法 > HTML 属性 > 纯文本 URL
 *
 * @internal
 */
const DEFAULT_URL_PATTERN =
    /(?:!?\[[^\]]*\]\(([^)]+)\)|<[^>]+(?:src|href)=["']([^"']+)["']|https?:\/\/[^\s)>\]]+)/g;

/**
 * URL 提取选项
 *
 * @public
 */
export interface UrlExtractOptions {
    /** 自定义 URL 匹配正则（默认匹配 http/https URL） */
    pattern?: RegExp;
    /** 是否去重（基于 URL 字符串），默认 true */
    deduplicate?: boolean;
}

/**
 * 从文本检测的选项
 *
 * @public
 */
export interface CheckUrlsInTextOptions extends UrlExistenceBatchOptions, UrlExtractOptions {}

/**
 * 从文本检测的结果
 *
 * @public
 */
export interface CheckUrlsInTextResult extends UrlExistenceBatchResult {
    /** 从文本中提取的去重 URL 列表 */
    extractedUrls: string[];
}

/**
 * 从文本中提取所有 URL（支持 Markdown/HTML/纯文本）
 *
 * 支持的 URL 格式：
 * - Markdown 图片：`![alt](url)`
 * - Markdown 链接：`[text](url)`
 * - HTML img：`<img src="url">`
 * - HTML a：`<a href="url">`
 * - 纯文本 URL：`https://example.com/path`
 *
 * @param text - 要提取 URL 的文本
 * @param options - 提取选项
 * @returns 提取的 URL 列表
 *
 * @example
 * ```typescript
 * import { extractUrlsFromText } from '@cmtx/asset/utils/url-existence-check';
 *
 * const urls = extractUrlsFromText(`
 *   ![logo](https://example.com/logo.png)
 *   [docs](https://example.com/docs)
 *   Visit https://example.com/path
 * `);
 * // ['https://example.com/logo.png', 'https://example.com/docs', 'https://example.com/path']
 * ```
 *
 * @public
 */
export function extractUrlsFromText(text: string, options?: UrlExtractOptions): string[] {
    const pattern = options?.pattern ?? DEFAULT_URL_PATTERN;
    const deduplicate = options?.deduplicate !== false;

    const resetPattern = new RegExp(
        pattern.source,
        pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g",
    );
    const urls: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = resetPattern.exec(text)) !== null) {
        const url = match[1] || match[2] || match[0];
        if (url) {
            urls.push(url);
        }
    }

    if (deduplicate) {
        return [...new Set(urls)];
    }

    return urls;
}

/**
 * 从文本中提取 URL 并检测存在性（组合操作）
 *
 * @param text - 要检测的文本
 * @param options - 检测选项
 * @returns 包含提取 URL 信息的批量检测结果
 *
 * @example
 * ```typescript
 * import { checkUrlsInText } from '@cmtx/asset/utils/url-existence-check';
 *
 * const result = await checkUrlsInText(`
 *   ![image1](https://example.com/valid.png)
 *   ![image2](https://example.com/missing.png)
 * `, { concurrency: 3 });
 *
 * console.log(`Extracted ${result.extractedUrls.length} URLs`);
 * console.log(`${result.existsCount}/${result.total} URLs exist`);
 * ```
 *
 * @public
 */
export async function checkUrlsInText(
    text: string,
    options?: CheckUrlsInTextOptions,
): Promise<CheckUrlsInTextResult> {
    const extractedUrls = extractUrlsFromText(text, options);
    const batchResult = await checkUrlExistsBatch(extractedUrls, options);

    return {
        ...batchResult,
        extractedUrls,
    };
}
