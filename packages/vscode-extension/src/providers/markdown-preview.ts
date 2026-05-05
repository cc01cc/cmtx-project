import { presignedUrlPlugin } from "@cmtx/markdown-it-presigned-url";
import type { PresignedUrlAdapterOptions } from "@cmtx/markdown-it-presigned-url-adapter-nodejs";
import type { CloudStorageConfig } from "@cmtx/storage";
import type { PresignedUrlResolvedOptions } from "@cmtx/asset/config";
import type MarkdownIt from "markdown-it";
import type * as vscode from "vscode";
import { getModuleLogger } from "../infra/index.js";
import { createVsCodeAdapter, type VsCodeAdapter } from "../presigned-url/create-vscode-adapter.js";

let adapter: VsCodeAdapter | null = null;
let currentOptions: PresignedUrlAdapterOptions | null = null;
let currentImageFormat: "markdown" | "html" | "all" = "all";
let outputChannel: vscode.OutputChannel | null = null;
let enabled = true;

/**
 * Returns whether the presigned URL feature is currently enabled.
 *
 * The enabled state is controlled by the `cmtx.presignedUrls.enabled`
 * VS Code setting and can be toggled at runtime via the
 * `cmtx.togglePresignedUrls` command.
 */
export function isPresignedUrlEnabled(): boolean {
    return enabled;
}

/**
 * Sets the presigned URL enabled state at runtime.
 *
 * This is used internally by the toggle command to activate or
 * deactivate the feature without requiring a window reload.
 */
export function setPresignedUrlEnabled(value: boolean): void {
    enabled = value;
}

export function initializePresignedUrl(
    options: PresignedUrlResolvedOptions,
    channel: vscode.OutputChannel,
): void {
    const logger = getModuleLogger("presigned-url");
    outputChannel = channel;
    enabled = true;

    if (!options.domains?.length) {
        logger.info("停用预签名 URL 功能");
        adapter = null;
        currentOptions = null;
        return;
    }

    currentImageFormat = options.imageFormat ?? "all";

    const adapterOptions: PresignedUrlAdapterOptions = {
        storageConfigs: options.storageConfigs,
        domains: options.domains,
        expire: options.expire,
        maxRetryCount: options.maxRetryCount,
    };

    currentOptions = adapterOptions;

    const storageCount = Object.keys(options.storageConfigs).length;
    const domainsCount = options.domains.length;
    logger.info(
        `预签名配置：storages=${storageCount}, domains=${domainsCount}, expire=${options.expire}s, maxRetry=${options.maxRetryCount}`,
    );

    adapter = createVsCodeAdapter({
        ...adapterOptions,
        outputChannel,
    });

    validateCredentialPresence(options.storageConfigs);
}

function validateCredentialPresence(storageConfigs: Record<string, CloudStorageConfig>): void {
    const logger = getModuleLogger("presigned-url");
    const aliyunStorages = Object.entries(storageConfigs).filter(
        ([_, p]) => p.provider === "aliyun-oss",
    );

    if (aliyunStorages.length === 0) {
        return;
    }

    for (const [storageId, provider] of aliyunStorages) {
        const hasConfigCreds = provider.accessKeyId && provider.accessKeySecret;

        if (!hasConfigCreds) {
            logger.error(
                `Storage '${storageId}' 缺少认证信息。请在 .cmtx/config.yaml 中提供 accessKeyId/accessKeySecret，可以使用环境变量语法如 \${CMTX_ALIYUN_ACCESS_KEY_ID}。预签名将回退为原始 URL。`,
            );
        }
    }
}

export function extendMarkdownIt(md: MarkdownIt): MarkdownIt {
    const logger = getModuleLogger("presigned-url");
    logger.info("=== extendMarkdownIt 被调用 ===");
    logger.info(
        `MarkdownIt 实例：${JSON.stringify({
            hasImage: typeof md.renderer?.rules?.image === "function",
            options: Object.keys(md.options || {}),
        })}`,
    );

    if (currentOptions && Object.keys(currentOptions.storageConfigs).length > 0 && adapter) {
        logger.info("配置已加载，应用预签名 URL 插件");
        return applyPluginWithConfig(md, currentOptions, currentImageFormat, adapter);
    }

    logger.warn("配置未加载或无效，预签名 URL 插件未启用");
    return md;
}

function applyPluginWithConfig(
    md: MarkdownIt,
    options: PresignedUrlAdapterOptions,
    imageFormat: "markdown" | "html" | "all",
    adapterInstance: VsCodeAdapter,
): MarkdownIt {
    const logger = getModuleLogger("presigned-url");
    const domains = options.domains?.map((d) => d.domain) ?? [];
    const storageCount = Object.keys(options.storageConfigs).length;
    logger.info(`应用插件配置：domains=${domains.join(", ")}, storageConfigs=${storageCount}`);

    return md.use(presignedUrlPlugin, {
        domains,
        imageFormat,
        enabled: () => enabled,
        getSignedUrl: adapterInstance.getSignedUrl,
        requestSignedUrl: adapterInstance.requestSignedUrl,
        onSignedUrlReady: adapterInstance.onSignedUrlReady,
    });
}

export function clearPresignedCache(): void {
    const logger = getModuleLogger("presigned-url");
    if (!adapter) {
        logger.warn("适配器未初始化，无法清空缓存");
        return;
    }
    adapter.clearCache();
    logger.info("Presigned URL 缓存已清空");
}

export function deactivatePresignedUrl(): void {
    const logger = getModuleLogger("presigned-url");
    logger.info("停用预签名 URL 功能");
    adapter = null;
    currentOptions = null;
    outputChannel = null;
    enabled = false;
}

export function reloadPresignedUrlConfig(
    options: PresignedUrlResolvedOptions | null,
    channel: vscode.OutputChannel,
): void {
    const logger = getModuleLogger("presigned-url");
    logger.info("重新加载预签名 URL 配置");

    adapter = null;
    currentOptions = null;

    if (options) {
        initializePresignedUrl(options, channel);
    }
}
