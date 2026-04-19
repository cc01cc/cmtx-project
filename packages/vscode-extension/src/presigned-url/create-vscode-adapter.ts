import type { Logger } from '@cmtx/markdown-it-presigned-url';
import type { PresignedUrlAdapterOptions } from '@cmtx/markdown-it-presigned-url-adapter-nodejs';
import { UrlCacheManager, UrlSigner } from '@cmtx/markdown-it-presigned-url-adapter-nodejs';
import * as vscode from 'vscode';

export interface VsCodeAdapterConfig extends PresignedUrlAdapterOptions {
    outputChannel: vscode.OutputChannel;
}

export interface VsCodeAdapter {
    getSignedUrl: (src: string) => string | null;
    requestSignedUrl: (src: string) => Promise<string>;
    onSignedUrlReady: () => void;
    clearCache: () => void;
}

export function createVsCodeAdapter(config: VsCodeAdapterConfig): VsCodeAdapter {
    const { outputChannel, ...adapterOptions } = config;

    // 创建 logger，同时输出到 OutputChannel 和 Debug Console
    const logger: Logger = {
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

    // 创建带 logger 的 options
    const optionsWithLogger: PresignedUrlAdapterOptions = {
        ...adapterOptions,
        logger,
    };

    // 创建缓存管理器和签名器
    const cacheManager = new UrlCacheManager(logger);
    const urlSigner = new UrlSigner(optionsWithLogger, cacheManager);

    let previewRefreshScheduled = false;

    const schedulePreviewRefresh = (): void => {
        if (previewRefreshScheduled) {
            return;
        }

        previewRefreshScheduled = true;
        setTimeout(async () => {
            try {
                await cacheManager.waitForAllPending();
                logger.info('所有预签名 URL 请求完成，刷新预览');
                await vscode.commands.executeCommand('markdown.preview.refresh');
            } finally {
                previewRefreshScheduled = false;
            }
        }, 0);
    };

    const getSignedUrl = (src: string): string | null => {
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

    const requestSignedUrl = async (src: string): Promise<string> => {
        const pendingRequest = cacheManager.getPendingRequest(src);

        if (!pendingRequest) {
            if (!cacheManager.canRetry(src, adapterOptions.maxRetryCount)) {
                logger.warn(
                    `已达到最大重试次数（${adapterOptions.maxRetryCount}），停止预签名请求：${src}`
                );
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
                        `预签名未生效，已回退原始 URL：${src}，失败次数 ${retryCount}/${adapterOptions.maxRetryCount}`
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
                    `预签名 URL 生成失败（${retryCount}/${adapterOptions.maxRetryCount}）：${err}`
                );
                cacheManager.removePendingRequest(src);
                return src;
            }
        } else {
            logger.debug(`已有待处理的预签名 URL 请求：${src}`);
            return pendingRequest;
        }
    };

    return {
        getSignedUrl,
        requestSignedUrl,
        onSignedUrlReady: schedulePreviewRefresh,
        clearCache: () => cacheManager.clear(),
    };
}
