import type { CloudStorageConfig, CloudProvider } from "@cmtx/storage";
import type { CmtxPresignedUrlConfig, CmtxStorageConfig } from "./types.js";

const ADAPTER_PROVIDER_MAP: Record<string, CloudProvider> = {
    "aliyun-oss": "aliyun-oss",
    "tencent-cos": "tencent-cos",
};

interface ResolvedDomainConfig {
    domain: string;
    useStorage: string;
    prefix?: string;
}

export interface PresignedUrlResolvedOptions {
    storageConfigs: Record<string, CloudStorageConfig>;
    domains: ResolvedDomainConfig[];
    expire: number;
    maxRetryCount: number;
    imageFormat?: "markdown" | "html" | "all";
}

export function resolvePresignedUrlOptions(
    presignedUrls: CmtxPresignedUrlConfig,
    storages?: Record<string, CmtxStorageConfig>,
): PresignedUrlResolvedOptions {
    const storageConfigs: Record<string, CloudStorageConfig> = {};
    const domains: ResolvedDomainConfig[] = [];

    for (const [index, domain] of (presignedUrls.domains ?? []).entries()) {
        const storageId = domain.domain || `domain-${index}`;

        if (!storages) {
            throw new Error(
                `Domain "${domain.domain}" specifies useStorage "${domain.useStorage}" but no storages pool is configured`,
            );
        }
        const storage = storages[domain.useStorage];
        if (!storage) {
            throw new Error(
                `Storage ID "${domain.useStorage}" not found in storages pool. ` +
                    `Configured storages: ${Object.keys(storages).join(", ") || "(none)"}`,
            );
        }
        const provider = ADAPTER_PROVIDER_MAP[storage.adapter];
        if (!provider) {
            throw new Error(
                `Unsupported storage adapter "${storage.adapter}" for storage "${domain.useStorage}". ` +
                    `Expected "aliyun-oss" or "tencent-cos"`,
            );
        }
        storageConfigs[storageId] = {
            provider: provider as CloudProvider,
            bucket: storage.config.bucket || "",
            region: storage.config.region || "",
            accessKeyId: storage.config.accessKeyId,
            accessKeySecret: storage.config.accessKeySecret,
        };
        domains.push({
            domain: domain.domain,
            useStorage: storageId,
            prefix: domain.path,
        });
    }

    return {
        storageConfigs,
        domains,
        expire: presignedUrls.expire ?? 600,
        maxRetryCount: presignedUrls.maxRetryCount ?? 3,
    };
}
