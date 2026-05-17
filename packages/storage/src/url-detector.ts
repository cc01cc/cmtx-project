/**
 * URL 检测工具
 *
 * 识别和检测云存储 URL 的服务商、类型和元数据。
 *
 * 支持的云服务商：
 * - 阿里云 OSS
 * - 腾讯云 COS
 * - AWS S3
 */

// ==================== 类型定义 ====================

export type DetectedCloudProvider = "aliyun" | "tencent" | "aws" | "unknown";

export enum StorageUrlType {
    ALIYUN_OSS = "aliyun_oss",
    ALIYUN_OSS_SIGNED = "aliyun_oss_signed",
    TENCENT_COS = "tencent_cos",
    TENCENT_COS_SIGNED = "tencent_cos_signed",
    AWS_S3 = "aws_s3",
    AWS_S3_SIGNED = "aws_s3_signed",
    CUSTOM_DOMAIN = "custom_domain",
    OTHER = "other",
}

export interface StorageUrlInfo {
    originalUrl: string;
    url: URL;
    provider: DetectedCloudProvider;
    urlType: StorageUrlType;
    isSigned: boolean;
    bucket?: string;
    region?: string;
    key?: string;
    customDomain?: string;
}

export interface StorageUrlDetectOptions {
    customDomains?: string[];
    domainProviderMap?: Record<string, DetectedCloudProvider>;
}

// ==================== 常量 ====================

const SIGNED_URL_PARAMS = {
    ALIYUN: ["OSSAccessKeyId", "Expires", "Signature"],
    TENCENT: ["q-sign-algorithm", "q-ak", "q-sign-time", "q-signature"],
    AWS: ["X-Amz-Algorithm", "X-Amz-Credential", "X-Amz-Signature"],
} as const;

const PROVIDER_DOMAINS = {
    ALIYUN: [".aliyuncs.com", "oss-accelerate.aliyuncs.com"],
    TENCENT: [".myqcloud.com", ".tencentcos.cn"],
    AWS: [".amazonaws.com"],
} as const;

// ==================== 内部工具函数 ====================

function hasParams(params: URLSearchParams, requiredParams: readonly string[]): boolean {
    return requiredParams.every((param) => params.has(param));
}

function detectSignedProvider(params: URLSearchParams): DetectedCloudProvider | null {
    if (hasParams(params, SIGNED_URL_PARAMS.ALIYUN)) return "aliyun";
    if (hasParams(params, SIGNED_URL_PARAMS.TENCENT)) return "tencent";
    if (hasParams(params, SIGNED_URL_PARAMS.AWS)) return "aws";
    return null;
}

function detectProviderByDomain(hostname: string): DetectedCloudProvider | null {
    const lower = hostname.toLowerCase();
    if (PROVIDER_DOMAINS.ALIYUN.some((d) => lower.endsWith(d))) return "aliyun";
    if (PROVIDER_DOMAINS.TENCENT.some((d) => lower.endsWith(d))) return "tencent";
    if (PROVIDER_DOMAINS.AWS.some((d) => lower.endsWith(d))) return "aws";
    return null;
}

function getProviderUrlType(provider: DetectedCloudProvider): StorageUrlType {
    switch (provider) {
        case "aliyun":
            return StorageUrlType.ALIYUN_OSS;
        case "tencent":
            return StorageUrlType.TENCENT_COS;
        case "aws":
            return StorageUrlType.AWS_S3;
        default:
            return StorageUrlType.OTHER;
    }
}

function getSignedUrlType(provider: DetectedCloudProvider): StorageUrlType {
    switch (provider) {
        case "aliyun":
            return StorageUrlType.ALIYUN_OSS_SIGNED;
        case "tencent":
            return StorageUrlType.TENCENT_COS_SIGNED;
        case "aws":
            return StorageUrlType.AWS_S3_SIGNED;
        default:
            return StorageUrlType.OTHER;
    }
}

function extractBucket(hostname: string, provider: DetectedCloudProvider): string | undefined {
    const lower = hostname.toLowerCase();
    switch (provider) {
        case "aliyun": {
            const m = lower.match(/^([^.]+)\.oss-/i);
            return m ? m[1] : undefined;
        }
        case "tencent": {
            const m = lower.match(/^([^-]+)-\d+\.cos\./i);
            return m ? m[1] : undefined;
        }
        case "aws": {
            const m = lower.match(/^([^.]+)\.s3\./i);
            return m ? m[1] : undefined;
        }
        default:
            return undefined;
    }
}

function extractRegion(hostname: string, provider: DetectedCloudProvider): string | undefined {
    const lower = hostname.toLowerCase();
    switch (provider) {
        case "aliyun": {
            const m = lower.match(/\.oss-([^.]+)\./i);
            return m ? m[1] : undefined;
        }
        case "tencent": {
            const m = lower.match(/\.cos\.([^.]+)\./i);
            return m ? m[1] : undefined;
        }
        case "aws": {
            const m = lower.match(/\.s3\.([^.]+)\./i);
            return m ? m[1] : undefined;
        }
        default:
            return undefined;
    }
}

function extractKey(pathname: string): string | undefined {
    if (!pathname || pathname === "/") return undefined;
    return pathname.startsWith("/") ? pathname.slice(1) : pathname;
}

function matchCustomDomain(hostname: string, customDomains: string[]): string | undefined {
    const lower = hostname.toLowerCase();
    for (const domain of customDomains) {
        const lowerDomain = domain.toLowerCase();
        if (lower === lowerDomain || lower.endsWith(`.${lowerDomain}`)) return domain;
    }
    return undefined;
}

// ==================== 公开 API ====================

export function detectStorageUrl(url: string, options?: StorageUrlDetectOptions): StorageUrlInfo {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname;
    const searchParams = parsedUrl.searchParams;
    const pathname = parsedUrl.pathname;

    const signedProvider = detectSignedProvider(searchParams);
    if (signedProvider) {
        return {
            originalUrl: url,
            url: parsedUrl,
            provider: signedProvider,
            urlType: getSignedUrlType(signedProvider),
            isSigned: true,
            bucket: extractBucket(hostname, signedProvider),
            region: extractRegion(hostname, signedProvider),
            key: extractKey(pathname),
        };
    }

    const provider = detectProviderByDomain(hostname);
    if (provider) {
        return {
            originalUrl: url,
            url: parsedUrl,
            provider,
            urlType: getProviderUrlType(provider),
            isSigned: false,
            bucket: extractBucket(hostname, provider),
            region: extractRegion(hostname, provider),
            key: extractKey(pathname),
        };
    }

    if (options?.customDomains?.length) {
        const customDomain = matchCustomDomain(hostname, options.customDomains);
        if (customDomain) {
            const mappedProvider = options.domainProviderMap?.[customDomain] || "unknown";
            return {
                originalUrl: url,
                url: parsedUrl,
                provider: mappedProvider,
                urlType: StorageUrlType.CUSTOM_DOMAIN,
                isSigned: false,
                customDomain,
                key: extractKey(pathname),
            };
        }
    }

    return {
        originalUrl: url,
        url: parsedUrl,
        provider: "unknown",
        urlType: StorageUrlType.OTHER,
        isSigned: false,
        key: extractKey(pathname),
    };
}

export function isSignedUrl(url: string): boolean {
    try {
        return detectSignedProvider(new URL(url).searchParams) !== null;
    } catch {
        return false;
    }
}

export function isStorageUrl(url: string, options?: StorageUrlDetectOptions): boolean {
    const result = detectStorageUrl(url, options);
    return result.provider !== "unknown" || result.urlType === StorageUrlType.CUSTOM_DOMAIN;
}

export function isAliyunOssUrl(url: string): boolean {
    return detectStorageUrl(url).provider === "aliyun";
}

export function isTencentCosUrl(url: string): boolean {
    return detectStorageUrl(url).provider === "tencent";
}

export function isAwsS3Url(url: string): boolean {
    return detectStorageUrl(url).provider === "aws";
}
