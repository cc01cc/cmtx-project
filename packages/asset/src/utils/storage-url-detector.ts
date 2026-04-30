/**
 * 云存储 URL 检测器
 *
 * @module utils/storage-url-detector
 * @description
 * 检测 URL 所属的云服务商，支持阿里云 OSS、腾讯云 COS、AWS S3。
 *
 * @remarks
 * ## 功能
 * - 检测云服务商类型（阿里云、腾讯云、AWS）
 * - 识别签名 URL
 * - 支持自定义域名映射
 * - 自动提取 bucket、region、key 等信息
 *
 * ## 官方文档
 * - 阿里云 OSS 地域和访问域名：<https://www.alibabacloud.com/help/en/oss/user-guide/regions-and-endpoints>
 * - 阿里云 OSS 签名 URL：<https://www.alibabacloud.com/help/en/oss/user-guide/signature-urls>
 * - 腾讯云 COS 地域和访问域名：<https://cloud.tencent.com/document/product/436/6224>
 * - 腾讯云 COS 请求签名：<https://cloud.tencent.com/document/product/436/7778>
 * - AWS S3 Virtual hosting：<https://docs.aws.amazon.com/AmazonS3/latest/userguide/VirtualHosting.html>
 * - AWS S3 Presigned URLs：<https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html>
 */

import type {
    DetectedCloudProvider,
    StorageUrlDetectOptions,
    StorageUrlInfo,
    StorageUrlType,
} from "./storage-url-types.js";
import { StorageUrlType as UrlTypeEnum } from "./storage-url-types.js";

/**
 * 各云服务商签名 URL 的必需参数
 *
 * @remarks
 * ## 签名参数说明
 *
 * ### 阿里云 OSS
 * - `OSSAccessKeyId` - 访问密钥 ID
 * - `Expires` - 过期时间（Unix 时间戳）
 * - `Signature` - 签名值
 *
 * ### 腾讯云 COS
 * - `q-sign-algorithm` - 签名算法（sha1）
 * - `q-ak` - SecretId
 * - `q-sign-time` - 签名有效时间
 * - `q-signature` - 签名值
 *
 * ### AWS S3
 * - `X-Amz-Algorithm` - 签名算法（AWS4-HMAC-SHA256）
 * - `X-Amz-Credential` - 凭证信息
 * - `X-Amz-Signature` - 签名值
 */
const SIGNED_URL_PARAMS = {
    ALIYUN: ["OSSAccessKeyId", "Expires", "Signature"],
    TENCENT: ["q-sign-algorithm", "q-ak", "q-sign-time", "q-signature"],
    AWS: ["X-Amz-Algorithm", "X-Amz-Credential", "X-Amz-Signature"],
} as const;

/**
 * 各云服务商域名特征
 *
 * @remarks
 * ## 域名格式
 *
 * ### 阿里云 OSS
 * - 默认域名：`.aliyuncs.com`
 * - 全球加速：`oss-accelerate.aliyuncs.com`
 *
 * ### 腾讯云 COS
 * - 默认域名：`.myqcloud.com`
 * - 内网加速：`.tencentcos.cn`
 *
 * ### AWS S3
 * - 默认域名：`.amazonaws.com`
 */
const PROVIDER_DOMAINS = {
    ALIYUN: [".aliyuncs.com", "oss-accelerate.aliyuncs.com"],
    TENCENT: [".myqcloud.com", ".tencentcos.cn"],
    AWS: [".amazonaws.com"],
} as const;

/**
 * 检测签名 URL 的云服务商
 *
 * @param params - URL 查询参数
 * @returns 云服务商类型，如果不是签名 URL 返回 null
 *
 * @internal
 */
function detectSignedProvider(params: URLSearchParams): DetectedCloudProvider | null {
    if (hasParams(params, SIGNED_URL_PARAMS.ALIYUN)) {
        return "aliyun";
    }
    if (hasParams(params, SIGNED_URL_PARAMS.TENCENT)) {
        return "tencent";
    }
    if (hasParams(params, SIGNED_URL_PARAMS.AWS)) {
        return "aws";
    }
    return null;
}

/**
 * 根据域名检测云服务商
 *
 * @param hostname - URL 主机名
 * @returns 云服务商类型，如果不是云服务商域名返回 null
 *
 * @internal
 */
function detectProviderByDomain(hostname: string): DetectedCloudProvider | null {
    const lowerHostname = hostname.toLowerCase();

    if (PROVIDER_DOMAINS.ALIYUN.some((d) => lowerHostname.endsWith(d))) {
        return "aliyun";
    }
    if (PROVIDER_DOMAINS.TENCENT.some((d) => lowerHostname.endsWith(d))) {
        return "tencent";
    }
    if (PROVIDER_DOMAINS.AWS.some((d) => lowerHostname.endsWith(d))) {
        return "aws";
    }
    return null;
}

/**
 * 检查 URL 是否包含所有必需的参数
 *
 * @param params - URL 查询参数
 * @param requiredParams - 必需的参数列表
 * @returns 如果包含所有必需参数返回 true
 *
 * @internal
 */
function hasParams(params: URLSearchParams, requiredParams: readonly string[]): boolean {
    return requiredParams.every((param) => params.has(param));
}

/**
 * 根据云服务商获取对应的 URL 类型
 *
 * @param provider - 云服务商类型
 * @returns 对应的 URL 类型（未签名）
 *
 * @internal
 */
function getProviderUrlType(provider: DetectedCloudProvider): StorageUrlType {
    switch (provider) {
        case "aliyun":
            return UrlTypeEnum.ALIYUN_OSS;
        case "tencent":
            return UrlTypeEnum.TENCENT_COS;
        case "aws":
            return UrlTypeEnum.AWS_S3;
        default:
            return UrlTypeEnum.OTHER;
    }
}

/**
 * 根据云服务商获取对应的签名 URL 类型
 *
 * @param provider - 云服务商类型
 * @returns 对应的签名 URL 类型
 *
 * @internal
 */
function getSignedUrlType(provider: DetectedCloudProvider): StorageUrlType {
    switch (provider) {
        case "aliyun":
            return UrlTypeEnum.ALIYUN_OSS_SIGNED;
        case "tencent":
            return UrlTypeEnum.TENCENT_COS_SIGNED;
        case "aws":
            return UrlTypeEnum.AWS_S3_SIGNED;
        default:
            return UrlTypeEnum.OTHER;
    }
}

/**
 * 从 URL 提取 bucket 名称
 *
 * @param hostname - URL 主机名
 * @param provider - 云服务商类型
 * @returns bucket 名称（如果可提取）
 *
 * @internal
 */
function extractBucket(hostname: string, provider: DetectedCloudProvider): string | undefined {
    const lowerHostname = hostname.toLowerCase();

    switch (provider) {
        case "aliyun": {
            // 格式：<bucket>.oss-<region>.aliyuncs.com
            const match = lowerHostname.match(/^([^.]+)\.oss-/i);
            return match ? match[1] : undefined;
        }
        case "tencent": {
            // 格式：<bucket>-<appid>.cos.<region>.myqcloud.com
            const match = lowerHostname.match(/^([^-]+)-\d+\.cos\./i);
            return match ? match[1] : undefined;
        }
        case "aws": {
            // 格式：<bucket>.s3.<region>.amazonaws.com
            const match = lowerHostname.match(/^([^.]+)\.s3\./i);
            return match ? match[1] : undefined;
        }
        default:
            return undefined;
    }
}

/**
 * 从 URL 提取 region
 *
 * @param hostname - URL 主机名
 * @param provider - 云服务商类型
 * @returns region（如果可提取）
 *
 * @internal
 */
function extractRegion(hostname: string, provider: DetectedCloudProvider): string | undefined {
    const lowerHostname = hostname.toLowerCase();

    switch (provider) {
        case "aliyun": {
            // 格式：<bucket>.oss-<region>.aliyuncs.com
            const match = lowerHostname.match(/\.oss-([^.]+)\./i);
            return match ? match[1] : undefined;
        }
        case "tencent": {
            // 格式：<bucket>-<appid>.cos.<region>.myqcloud.com
            const match = lowerHostname.match(/\.cos\.([^.]+)\./i);
            return match ? match[1] : undefined;
        }
        case "aws": {
            // 格式：<bucket>.s3.<region>.amazonaws.com
            const match = lowerHostname.match(/\.s3\.([^.]+)\./i);
            return match ? match[1] : undefined;
        }
        default:
            return undefined;
    }
}

/**
 * 从 URL path 提取 key（对象路径）
 *
 * @param pathname - URL 路径
 * @returns 对象键（去掉开头的 /）
 *
 * @internal
 */
function extractKey(pathname: string): string | undefined {
    if (!pathname || pathname === "/") {
        return undefined;
    }
    // 去掉开头的 /
    return pathname.startsWith("/") ? pathname.slice(1) : pathname;
}

/**
 * 匹配自定义域名
 *
 * @param hostname - URL 主机名
 * @param customDomains - 自定义域名列表
 * @returns 匹配的域名，如果没有匹配返回 undefined
 *
 * @internal
 */
function matchCustomDomain(hostname: string, customDomains: string[]): string | undefined {
    const lowerHostname = hostname.toLowerCase();

    for (const domain of customDomains) {
        const lowerDomain = domain.toLowerCase();
        if (lowerHostname === lowerDomain || lowerHostname.endsWith(`.${lowerDomain}`)) {
            return domain;
        }
    }
    return undefined;
}

/**
 * 检测云存储 URL 类型
 *
 * @param url - 要检测的 URL 字符串
 * @param options - 检测选项（可选）
 * @returns URL 检测结果
 *
 * @remarks
 * ## 检测逻辑
 *
 * 1. **检测签名 URL** - 根据查询参数判断是否为签名 URL，并识别云服务商
 * 2. **检测云服务商域名** - 根据域名特征判断云服务商
 * 3. **检测自定义域名** - 如果提供了自定义域名列表，进行匹配
 * 4. **其他 URL** - 不属于以上任何一种情况
 *
 * ## 提取信息
 *
 * 对于识别的云存储 URL，会自动提取：
 * - `bucket` - 存储桶名称
 * - `region` - 地域
 * - `key` - 对象路径
 *
 * @example
 * ```typescript
 * // 检测阿里云 OSS URL
 * const result1 = detectStorageUrl('https://mybucket.oss-cn-hangzhou.aliyuncs.com/image.png');
 * console.log(result1.provider); // 'aliyun'
 * console.log(result1.urlType); // StorageUrlType.ALIYUN_OSS
 * console.log(result1.bucket); // 'mybucket'
 * console.log(result1.region); // 'cn-hangzhou'
 *
 * // 检测签名 URL
 * const result2 = detectStorageUrl('https://mybucket.oss-cn-hangzhou.aliyuncs.com/image.png?OSSAccessKeyId=xxx&Expires=1234567890&Signature=abc');
 * console.log(result2.isSigned); // true
 * console.log(result2.urlType); // StorageUrlType.ALIYUN_OSS_SIGNED
 *
 * // 使用自定义域名
 * const result3 = detectStorageUrl('https://cdn.example.com/image.png', {
 *   customDomains: ['cdn.example.com'],
 *   domainProviderMap: { 'cdn.example.com': 'aliyun' }
 * });
 * console.log(result3.customDomain); // 'cdn.example.com'
 * console.log(result3.provider); // 'aliyun'
 * ```
 *
 * @throws {TypeError} 如果 URL 格式无效会抛出错误
 *
 * @public
 */
export function detectStorageUrl(url: string, options?: StorageUrlDetectOptions): StorageUrlInfo {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname;
    const searchParams = parsedUrl.searchParams;
    const pathname = parsedUrl.pathname;

    // 1. 检测签名 URL
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

    // 2. 检测云服务商域名
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

    // 3. 检测自定义域名
    if (options?.customDomains && options.customDomains.length > 0) {
        const customDomain = matchCustomDomain(hostname, options.customDomains);
        if (customDomain) {
            const mappedProvider = options.domainProviderMap?.[customDomain] || "unknown";
            return {
                originalUrl: url,
                url: parsedUrl,
                provider: mappedProvider,
                urlType: UrlTypeEnum.CUSTOM_DOMAIN,
                isSigned: false,
                customDomain,
                bucket: undefined,
                region: undefined,
                key: extractKey(pathname),
            };
        }
    }

    // 4. 其他 URL
    return {
        originalUrl: url,
        url: parsedUrl,
        provider: "unknown",
        urlType: UrlTypeEnum.OTHER,
        isSigned: false,
        key: extractKey(pathname),
    };
}

/**
 * 检测 URL 是否为签名 URL
 *
 * @param url - 要检测的 URL 字符串
 * @returns 如果是签名 URL 返回 true
 *
 * @remarks
 * ## 检测逻辑
 *
 * 检查 URL 是否包含各云服务商签名 URL 的必需参数：
 * - 阿里云 OSS: `OSSAccessKeyId`, `Expires`, `Signature`
 * - 腾讯云 COS: `q-sign-algorithm`, `q-ak`, `q-sign-time`, `q-signature`
 * - AWS S3: `X-Amz-Algorithm`, `X-Amz-Credential`, `X-Amz-Signature`
 *
 * @example
 * ```typescript
 * // 检测阿里云签名 URL
 * isSignedUrl('https://mybucket.oss-cn-hangzhou.aliyuncs.com/image.png?OSSAccessKeyId=xxx&Expires=1234567890&Signature=abc');
 * // 返回：true
 *
 * // 检测未签名 URL
 * isSignedUrl('https://mybucket.oss-cn-hangzhou.aliyuncs.com/image.png');
 * // 返回：false
 * ```
 *
 * @public
 */
export function isSignedUrl(url: string): boolean {
    try {
        const parsedUrl = new URL(url);
        const signedProvider = detectSignedProvider(parsedUrl.searchParams);
        return signedProvider !== null;
    } catch {
        return false;
    }
}

/**
 * 判断 URL 是否为云存储 URL
 *
 * @param url - 要判断的 URL 字符串
 * @param options - 检测选项（可选）
 * @returns 如果是云存储 URL 返回 true
 *
 * @remarks
 * ## 判断逻辑
 *
 * 检查 URL 是否属于以下云服务商：
 * - 阿里云 OSS
 * - 腾讯云 COS
 * - AWS S3
 * - 自定义域名（如果配置了映射）
 *
 * @example
 * ```typescript
 * // 阿里云 OSS
 * isStorageUrl('https://mybucket.oss-cn-hangzhou.aliyuncs.com/image.png');
 * // 返回：true
 *
 * // 腾讯云 COS
 * isStorageUrl('https://examplebucket-1250000000.cos.ap-guangzhou.myqcloud.com/image.png');
 * // 返回：true
 *
 * // AWS S3
 * isStorageUrl('https://mybucket.s3.us-west-2.amazonaws.com/image.png');
 * // 返回：true
 *
 * // 普通 URL
 * isStorageUrl('https://example.com/image.png');
 * // 返回：false
 * ```
 *
 * @public
 */
export function isStorageUrl(url: string, options?: StorageUrlDetectOptions): boolean {
    const result = detectStorageUrl(url, options);
    return result.provider !== "unknown" || result.urlType === UrlTypeEnum.CUSTOM_DOMAIN;
}

/**
 * 判断 URL 是否为阿里云 OSS URL
 *
 * @param url - 要判断的 URL 字符串
 * @returns 如果是阿里云 OSS URL 返回 true
 *
 * @remarks
 * ## 判断逻辑
 *
 * 检查 URL 是否满足以下条件之一：
 * - 域名以 `.aliyuncs.com` 结尾
 * - 包含阿里云签名参数（`OSSAccessKeyId`, `Expires`, `Signature`）
 *
 * @example
 * ```typescript
 * isAliyunOssUrl('https://mybucket.oss-cn-hangzhou.aliyuncs.com/image.png');
 * // 返回：true
 *
 * isAliyunOssUrl('https://mybucket.oss-accelerate.aliyuncs.com/image.png');
 * // 返回：true
 *
 * isAliyunOssUrl('https://example.com/image.png');
 * // 返回：false
 * ```
 *
 * @public
 */
export function isAliyunOssUrl(url: string): boolean {
    const result = detectStorageUrl(url);
    return result.provider === "aliyun";
}

/**
 * 判断 URL 是否为腾讯云 COS URL
 *
 * @param url - 要判断的 URL 字符串
 * @returns 如果是腾讯云 COS URL 返回 true
 *
 * @remarks
 * ## 判断逻辑
 *
 * 检查 URL 是否满足以下条件之一：
 * - 域名以 `.myqcloud.com` 或 `.tencentcos.cn` 结尾
 * - 包含腾讯云签名参数（`q-sign-algorithm`, `q-ak`, `q-sign-time`, `q-signature`）
 *
 * @example
 * ```typescript
 * isTencentCosUrl('https://examplebucket-1250000000.cos.ap-guangzhou.myqcloud.com/image.png');
 * // 返回：true
 *
 * isTencentCosUrl('https://example.com/image.png');
 * // 返回：false
 * ```
 *
 * @public
 */
export function isTencentCosUrl(url: string): boolean {
    const result = detectStorageUrl(url);
    return result.provider === "tencent";
}

/**
 * 判断 URL 是否为 AWS S3 URL
 *
 * @param url - 要判断的 URL 字符串
 * @returns 如果是 AWS S3 URL 返回 true
 *
 * @remarks
 * ## 判断逻辑
 *
 * 检查 URL 是否满足以下条件之一：
 * - 域名以 `.amazonaws.com` 结尾
 * - 包含 AWS 签名参数（`X-Amz-Algorithm`, `X-Amz-Credential`, `X-Amz-Signature`）
 *
 * @example
 * ```typescript
 * isAwsS3Url('https://mybucket.s3.us-west-2.amazonaws.com/image.png');
 * // 返回：true
 *
 * isAwsS3Url('https://example.com/image.png');
 * // 返回：false
 * ```
 *
 * @public
 */
export function isAwsS3Url(url: string): boolean {
    const result = detectStorageUrl(url);
    return result.provider === "aws";
}
