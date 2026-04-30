import { presignedUrlPlugin } from "@cmtx/markdown-it-presigned-url";
import type {
    PresignedUrlAdapterOptions,
    PresignedUrlDomainConfig,
} from "@cmtx/markdown-it-presigned-url-adapter-nodejs";
import type { CloudProvider, CloudStorageConfig } from "@cmtx/storage";
import type MarkdownIt from "markdown-it";
import type * as vscode from "vscode";
import type { CmtxPresignedUrlConfig } from "@cmtx/asset/config";
import { getModuleLogger } from "../infra/index.js";
import { createVsCodeAdapter, type VsCodeAdapter } from "../presigned-url/create-vscode-adapter.js";

let adapter: VsCodeAdapter | null = null;
let currentOptions: PresignedUrlAdapterOptions | null = null;
let currentImageFormat: "markdown" | "html" | "all" = "all";
let outputChannel: vscode.OutputChannel | null = null;

export function initializePresignedUrl(
    presignedUrls: CmtxPresignedUrlConfig | null,
    channel: vscode.OutputChannel,
): void {
    const logger = getModuleLogger("presigned-url");
    outputChannel = channel;

    if (!presignedUrls?.domains?.length) {
        logger.info("停用预签名 URL 功能");
        adapter = null;
        currentOptions = null;
        return;
    }

    currentImageFormat = presignedUrls.imageFormat ?? "all";

    const storageConfigs: Record<string, CloudStorageConfig> = {};
    const domains: PresignedUrlDomainConfig[] = [];

    presignedUrls.domains.forEach((d, index) => {
        const storageId = d.domain || `storage-${index}`;
        storageConfigs[storageId] = {
            provider: d.provider as CloudProvider,
            bucket: d.bucket || "",
            region: d.region || "",
            accessKeyId: d.accessKeyId,
            accessKeySecret: d.accessKeySecret,
        };
        domains.push({
            domain: d.domain,
            useStorage: storageId,
            prefix: d.path,
        });
    });

    const adapterOptions: PresignedUrlAdapterOptions = {
        storageConfigs,
        domains,
        expire: presignedUrls.expire ?? 600,
        maxRetryCount: presignedUrls.maxRetryCount ?? 3,
    };

    currentOptions = adapterOptions;

    const storageCount = Object.keys(storageConfigs).length;
    const domainsCount = domains.length;
    logger.info(
        `预签名配置：storages=${storageCount}, domains=${domainsCount}, expire=${adapterOptions.expire}s, maxRetry=${adapterOptions.maxRetryCount}`,
    );

    adapter = createVsCodeAdapter({
        ...adapterOptions,
        outputChannel,
    });

    validateCredentialPresence(storageConfigs);
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
}

export function reloadPresignedUrlConfig(
    presignedUrls: CmtxPresignedUrlConfig | null,
    channel: vscode.OutputChannel,
): void {
    const logger = getModuleLogger("presigned-url");
    logger.info("重新加载预签名 URL 配置");

    adapter = null;
    currentOptions = null;

    initializePresignedUrl(presignedUrls, channel);
}
