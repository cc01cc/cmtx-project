import type { AliyunCredentials } from "@cmtx/storage";
import { AliOSSAdapter } from "@cmtx/storage/adapters/ali-oss";
import OSS from "ali-oss";
import type {
    CloudStorageConfig,
    PresignedUrlAdapterOptions,
    PresignedUrlDomainConfig,
} from "./types.js";
import type { UrlCacheManager } from "./url-cache-manager.js";

export interface Logger {
    debug: (message: string, ...args: unknown[]) => void;
    info: (message: string, ...args: unknown[]) => void;
    warn: (message: string, ...args: unknown[]) => void;
    error: (message: string, ...args: unknown[]) => void;
}

interface ResolvedDomainConfig extends PresignedUrlDomainConfig {
    /** 解析后的存储配置（从 storage pool 或独立配置中获取） */
    resolvedConfig: CloudStorageConfig;
}

export class UrlSigner {
    private readonly _domainMap: Map<string, ResolvedDomainConfig>;
    private readonly _expire: number;
    private readonly _maxRetryCount: number;
    private readonly _cacheManager: UrlCacheManager;
    private readonly _logger?: Logger;
    private static readonly FALLBACK_CACHE_SECONDS = 30;

    constructor(options: PresignedUrlAdapterOptions, cacheManager: UrlCacheManager) {
        this._logger = options.logger;
        this._domainMap = new Map();
        this._expire = options.expire || 600;
        this._maxRetryCount = Math.max(0, options.maxRetryCount ?? 3);
        this._cacheManager = cacheManager;

        // 解析每个 domain 配置
        for (const domainConfig of options.domains) {
            if (domainConfig.useStorage) {
                // 模式 1：引用 storage pool 中的 storage ID
                const storage = options.storageConfigs[domainConfig.useStorage];
                if (!storage) {
                    throw new Error(
                        `Storage ID "${domainConfig.useStorage}" not found in storages pool. ` +
                            `Available storage IDs: ${Object.keys(options.storageConfigs).join(", ")}`,
                    );
                }
                this._domainMap.set(domainConfig.domain, {
                    ...domainConfig,
                    resolvedConfig: storage,
                });
                this._logger?.info(
                    `Domain "${domainConfig.domain}" 使用 storage pool: "${domainConfig.useStorage}"`,
                );
            } else if (domainConfig.provider && domainConfig.config) {
                // 模式 2：独立配置 provider
                this._domainMap.set(domainConfig.domain, {
                    ...domainConfig,
                    resolvedConfig: domainConfig.config,
                });
                this._logger?.info(
                    `Domain "${domainConfig.domain}" 使用独立配置 provider: "${domainConfig.provider}"`,
                );
            } else {
                throw new Error(
                    `Domain "${domainConfig.domain}" must specify either useStorage or provider. ` +
                        `useStorage: ${domainConfig.useStorage}, provider: ${domainConfig.provider}`,
                );
            }
        }

        this._logger?.info("URL 签名器初始化完成");
        this._logger?.debug(`配置的域名数量：${this._domainMap.size}`);
        this._logger?.debug(`过期时间：${this._expire}秒`);
        this._logger?.debug(`最大重试次数：${this._maxRetryCount}`);
        this._logger?.debug(`已配置的域名：${Array.from(this._domainMap.keys()).join(", ")}`);
    }

    getMaxRetryCount(): number {
        return this._maxRetryCount;
    }

    private _getDomainConfig(url: string): ResolvedDomainConfig | undefined {
        try {
            const parsedUrl = new URL(url);
            const config = this._domainMap.get(parsedUrl.hostname);
            this._logger?.debug(`URL ${url} 匹配的配置：${config ? "已找到" : "未找到"}`);
            return config;
        } catch {
            this._logger?.warn(`解析 URL 失败：${url}`);
            return undefined;
        }
    }

    private _extractKey(url: string): string | null {
        try {
            const parsedUrl = new URL(url);
            const key = parsedUrl.pathname.substring(1);
            this._logger?.debug(`从 URL ${url} 提取 key: ${key}`);
            return key;
        } catch {
            this._logger?.warn(`从 URL 提取 key 失败：${url}`);
            return null;
        }
    }

    async signUrl(url: string): Promise<string> {
        this._logger?.info(`开始处理 URL 签名：${url}`);

        const cachedUrl = this._cacheManager.get(url);
        if (cachedUrl) {
            this._logger?.info(`使用缓存的预签名 URL：${url} -> ${cachedUrl}`);
            return cachedUrl;
        }

        const domainConfig = this._getDomainConfig(url);
        if (!domainConfig) {
            this._logger?.warn(`未找到匹配的域名配置：${url}`);
            this._cacheManager.set(url, url, UrlSigner.FALLBACK_CACHE_SECONDS);
            return url;
        }

        try {
            const config = domainConfig.resolvedConfig;
            this._logger?.info(`准备使用提供商 ${config.provider} 对 URL 进行签名`);
            let signedUrl: string;
            switch (config.provider) {
                case "aliyun-oss":
                    signedUrl = await this._signAliyunUrl(url, config);
                    break;
                case "tencent-cos":
                    signedUrl = await this._signTencentUrl(url, config);
                    break;
                case "aws-s3":
                    signedUrl = await this._signAwsUrl(url, config);
                    break;
                default:
                    this._logger?.error(`不支持的提供商类型：${String(config.provider)}`);
                    return url;
            }

            this._logger?.info(`将预签名 URL 加入缓存：${url} -> ${signedUrl}`);
            this._cacheManager.set(url, signedUrl, this._expire);

            return signedUrl;
        } catch (error) {
            this._logger?.error(
                `生成预签名 URL 失败：${error instanceof Error ? error.message : String(error)}`,
            );
            this._cacheManager.set(url, url, UrlSigner.FALLBACK_CACHE_SECONDS);
            this._logger?.warn(
                `已对失败结果设置短缓存（${UrlSigner.FALLBACK_CACHE_SECONDS}秒）：${url}`,
            );
            return url;
        }
    }

    private async _signAliyunUrl(url: string, config: CloudStorageConfig): Promise<string> {
        this._logger?.debug(`开始生成阿里云 OSS 预签名 URL: ${url}`);
        const key = this._extractKey(url);
        if (!key) {
            throw new Error(`无法从 URL 中提取对象键：${url}`);
        }

        const credentials = this._mergeCredentials(config);
        const ossAdapter = this._createOSSAdapter(credentials);

        this._logger?.debug(`正在生成预签名 URL，key: ${key}, 过期时间：${this._expire}秒`);
        const signedUrl = await ossAdapter.getSignedUrl(key, this._expire);

        this._logger?.info(`阿里云 OSS 预签名 URL 生成成功：${url} -> ${signedUrl}`);
        return signedUrl;
    }

    private async _signTencentUrl(url: string, _config: CloudStorageConfig): Promise<string> {
        this._logger?.warn(`腾讯云 COS 预签名 URL 功能暂未实现：${url}`);
        return url;
    }

    private async _signAwsUrl(url: string, _config: CloudStorageConfig): Promise<string> {
        this._logger?.warn(`AWS S3 预签名 URL 功能暂未实现：${url}`);
        return url;
    }

    private _mergeCredentials(config: CloudStorageConfig): AliyunCredentials {
        // 检查环境变量和配置文件的凭证
        const envKeyId =
            process.env.CMTX_ALIYUN_ACCESS_KEY_ID || process.env.ALIYUN_OSS_ACCESS_KEY_ID;
        const envSecret =
            process.env.CMTX_ALIYUN_ACCESS_KEY_SECRET || process.env.ALIYUN_OSS_ACCESS_KEY_SECRET;

        this._logger?.debug(
            `凭证来源检查：envKeyId=${!!envKeyId}, envSecret=${!!envSecret}, configKeyId=${!!config.accessKeyId}, configSecret=${!!config.accessKeySecret}`,
        );

        const accessKeyId = envKeyId || config.accessKeyId || "";
        const accessKeySecret = envSecret || config.accessKeySecret || "";

        // 输出最终使用的凭证信息（脱敏）
        const keyIdPreview = accessKeyId
            ? `${accessKeyId.substring(0, 6)}...${accessKeyId.slice(-4)}`
            : "未设置";
        const keySecretPreview = accessKeySecret
            ? `${accessKeySecret.substring(0, 4)}****`
            : "未设置";
        const source = envKeyId ? "环境变量" : config.accessKeyId ? "配置文件" : "未设置";

        this._logger?.info(
            `最终凭证：accessKeyId=${keyIdPreview}, accessKeySecret=${keySecretPreview}, 来源=${source}`,
        );

        if (!accessKeyId || !accessKeySecret) {
            this._logger?.warn("警告：accessKeyId 或 accessKeySecret 未设置，预签名将失败");
        }

        return {
            provider: "aliyun-oss",
            region: config.region,
            bucket: config.bucket,
            accessKeyId,
            accessKeySecret,
        };
    }

    private _createOSSAdapter(credentials: AliyunCredentials): AliOSSAdapter {
        const client = new OSS({
            region: credentials.region,
            accessKeyId: credentials.accessKeyId,
            accessKeySecret: credentials.accessKeySecret,
            bucket: credentials.bucket,
        });

        return new AliOSSAdapter(client);
    }
}
