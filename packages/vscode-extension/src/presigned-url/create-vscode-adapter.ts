/* eslint-disable no-console */

import type { Logger } from "@cmtx/markdown-it-presigned-url";
import type { PresignedUrlAdapterOptions } from "@cmtx/markdown-it-presigned-url-adapter-nodejs";
import { UrlCacheManager, UrlSigner } from "@cmtx/markdown-it-presigned-url-adapter-nodejs";
import * as vscode from "vscode";

export interface VsCodeAdapterConfig extends PresignedUrlAdapterOptions {
    outputChannel: vscode.OutputChannel;
}

export interface VsCodeAdapter {
    getSignedUrl: (src: string) => string | null;
    requestSignedUrl: (src: string) => Promise<string>;
    onSignedUrlReady: () => void;
    clearCache: () => void;
}

function createLogger(outputChannel: vscode.OutputChannel): Logger {
    return {
        debug: (message: string, ...args: unknown[]) => {
            const formatted = `[CMTX] [Adapter] DEBUG: ${message}`;
            outputChannel.appendLine(formatted);
            console.debug(formatted, ...args);
        },
        info: (message: string, ...args: unknown[]) => {
            const formatted = `[CMTX] [Adapter] INFO: ${message}`;
            outputChannel.appendLine(formatted);
            console.log(formatted, ...args);
        },
        warn: (message: string, ...args: unknown[]) => {
            const formatted = `[CMTX] [Adapter] WARN: ${message}`;
            outputChannel.appendLine(formatted);
            console.warn(formatted, ...args);
        },
        error: (message: string, ...args: unknown[]) => {
            const formatted = `[CMTX] [Adapter] ERROR: ${message}`;
            outputChannel.appendLine(formatted);
            console.error(formatted, ...args);
        },
    };
}

function createSchedulePreviewRefresh(cacheManager: UrlCacheManager, logger: Logger): () => void {
    let previewRefreshScheduled = false;

    return (): void => {
        if (previewRefreshScheduled) {
            return;
        }

        previewRefreshScheduled = true;
        setTimeout(async () => {
            try {
                await cacheManager.waitForAllPending();
                logger.info("所有预签名 URL 请求完成，刷新预览");
                await vscode.commands.executeCommand("markdown.preview.refresh");
            } finally {
                previewRefreshScheduled = false;
            }
        }, 0);
    };
}

function createGetSignedUrl(
    cacheManager: UrlCacheManager,
    urlSigner: UrlSigner,
    logger: Logger,
): (src: string) => string | null {
    return (src: string): string | null => {
        if (!cacheManager || !urlSigner) {
            return null;
        }

        const cachedUrl = cacheManager.get(src);
        if (cachedUrl) {
            if (cachedUrl === src) {
                logger.warn(`签名未生效，使用原始 URL 缓存回退：${src}`);
            } else {
                logger.info(`使用缓存的预签名 URL: ${src} -> ${cachedUrl}`);
            }
            return cachedUrl;
        }

        return null;
    };
}

function createRequestSignedUrl(
    cacheManager: UrlCacheManager,
    urlSigner: UrlSigner,
    maxRetryCount: number | undefined,
    logger: Logger,
): (src: string) => Promise<string> {
    return async (src: string): Promise<string> => {
        const pendingRequest = cacheManager.getPendingRequest(src);

        if (!pendingRequest) {
            if (!cacheManager.canRetry(src, maxRetryCount ?? 3)) {
                logger.warn(`已达到最大重试次数（${maxRetryCount ?? 3}），停止预签名请求：${src}`);
                return src;
            }

            logger.info(`触发异步预签名 URL 请求：${src}`);
            const signPromise = urlSigner.signUrl(src);
            cacheManager.addPendingRequest(src, signPromise);

            try {
                const signedUrl = await signPromise;
                if (signedUrl === src) {
                    const retryCount = cacheManager.recordFailure(src);
                    logger.warn(
                        `预签名未生效，已回退原始 URL：${src}，失败次数 ${retryCount}/${maxRetryCount ?? 3}`,
                    );
                } else {
                    cacheManager.resetRetry(src);
                    logger.info(`预签名 URL 生成成功：${src} -> ${signedUrl}`);
                }
                cacheManager.removePendingRequest(src);
                return signedUrl;
            } catch (err) {
                const retryCount = cacheManager.recordFailure(src);
                logger.error(
                    `预签名 URL 生成失败（${retryCount}/${maxRetryCount ?? 3}）：${String(err)}`,
                );
                cacheManager.removePendingRequest(src);
                return src;
            }
        } else {
            logger.debug(`已有待处理的预签名 URL 请求：${src}`);
            return pendingRequest;
        }
    };
}

export function createVsCodeAdapter(config: VsCodeAdapterConfig): VsCodeAdapter {
    const { outputChannel, ...adapterOptions } = config;

    const logger = createLogger(outputChannel);

    const optionsWithLogger: PresignedUrlAdapterOptions = {
        ...adapterOptions,
        logger,
    };

    const cacheManager = new UrlCacheManager(logger);
    const urlSigner = new UrlSigner(optionsWithLogger, cacheManager);

    return {
        getSignedUrl: createGetSignedUrl(cacheManager, urlSigner, logger),
        requestSignedUrl: createRequestSignedUrl(
            cacheManager,
            urlSigner,
            adapterOptions.maxRetryCount,
            logger,
        ),
        onSignedUrlReady: createSchedulePreviewRefresh(cacheManager, logger),
        clearCache: () => cacheManager.clear(),
    };
}
