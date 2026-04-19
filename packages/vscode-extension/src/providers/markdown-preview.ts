import { presignedUrlPlugin } from '@cmtx/markdown-it-presigned-url';
import type MarkdownIt from 'markdown-it';
import type * as vscode from 'vscode';
import { getLogger, type PresignedUrlConfig } from '../infra';
import { createVsCodeAdapter, type VsCodeAdapter } from '../presigned-url/create-vscode-adapter';

let adapter: VsCodeAdapter | null = null;
let currentConfig: PresignedUrlConfig | null = null;
let outputChannel: vscode.OutputChannel | null = null;

export function initializePresignedUrl(
    config: PresignedUrlConfig,
    channel: vscode.OutputChannel
): void {
    const logger = getLogger('presigned-url');
    logger.info('初始化预签名 URL 功能');

    // Note: 详细的配置日志已由 config-watcher.ts 中的 logConfigDetails 统一输出
    // 这里只输出简要的预签名配置信息
    logger.info(
        `预签名配置：providers=${config.providerConfigs.length}, expire=${config.expire}s, maxRetry=${config.maxRetryCount}`
    );

    currentConfig = config;
    outputChannel = channel;

    // 创建 VS Code 适配器
    adapter = createVsCodeAdapter({
        providerConfigs: config.providerConfigs,
        expire: config.expire,
        maxRetryCount: config.maxRetryCount,
        outputChannel,
    });

    validateCredentialPresence(config);
}

function validateCredentialPresence(config: PresignedUrlConfig): void {
    const logger = getLogger('presigned-url');
    const hasAliyunProvider = config.providerConfigs.some((p) => p.provider === 'aliyun-oss');
    if (!hasAliyunProvider) {
        return;
    }

    const aliyunProviders = config.providerConfigs.filter((p) => p.provider === 'aliyun-oss');

    for (const provider of aliyunProviders) {
        const hasConfigCreds = provider.accessKeyId && provider.accessKeySecret;

        if (!hasConfigCreds) {
            logger.error(
                `Provider (domain: ${provider.domain}) 缺少认证信息。请在 .cmtx/config.yaml 中提供 accessKeyId/accessKeySecret，可以使用环境变量语法如 \${CMTX_ALIYUN_ACCESS_KEY_ID}。预签名将回退为原始 URL。`
            );
        }
    }
}

export function extendMarkdownIt(md: MarkdownIt): MarkdownIt {
    const logger = getLogger('presigned-url');
    logger.info('=== extendMarkdownIt 被调用 ===');
    logger.info(
        `MarkdownIt 实例：${JSON.stringify({
            hasImage: typeof md.renderer?.rules?.image === 'function',
            options: Object.keys(md.options || {}),
        })}`
    );

    // 如果配置已加载且有效，应用插件
    if (currentConfig && currentConfig.providerConfigs.length > 0 && adapter) {
        logger.info('配置已加载，应用预签名 URL 插件');
        return applyPluginWithConfig(md, currentConfig, adapter);
    }

    // 配置未加载或无效，记录日志并返回原始实例
    logger.warn('配置未加载或无效，预签名 URL 插件未启用');
    return md;
}

function applyPluginWithConfig(
    md: MarkdownIt,
    config: PresignedUrlConfig,
    adapterInstance: VsCodeAdapter
): MarkdownIt {
    const logger = getLogger('presigned-url');
    logger.info(
        `应用插件配置：domains=${config.providerConfigs.map((p) => p.domain).join(', ')}, providerConfigs=${config.providerConfigs.length}`
    );

    return md.use(presignedUrlPlugin, {
        domains: config.providerConfigs.map((p) => p.domain),
        imageFormat: config.imageFormat ?? 'all',
        getSignedUrl: adapterInstance.getSignedUrl,
        requestSignedUrl: adapterInstance.requestSignedUrl,
        onSignedUrlReady: adapterInstance.onSignedUrlReady,
    });
}

export function clearPresignedCache(): void {
    const logger = getLogger('presigned-url');
    if (!adapter) {
        logger.warn('适配器未初始化，无法清空缓存');
        return;
    }
    adapter.clearCache();
    logger.info('Presigned URL 缓存已清空');
}

export function deactivatePresignedUrl(): void {
    const logger = getLogger('presigned-url');
    logger.info('停用预签名 URL 功能');
    adapter = null;
    currentConfig = null;
    outputChannel = null;
}

// 重新加载配置（用于配置变更时）
export function reloadPresignedUrlConfig(
    config: PresignedUrlConfig,
    channel: vscode.OutputChannel
): void {
    const logger = getLogger('presigned-url');
    logger.info('重新加载预签名 URL 配置');

    // 重置状态
    adapter = null;
    currentConfig = null;

    // 重新初始化
    initializePresignedUrl(config, channel);
}
