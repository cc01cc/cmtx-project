/**
 * 云存储凭证工厂
 *
 * @module credentials
 *
 * @description
 * 提供统一的云存储凭证创建工厂函数，支持从配置对象和环境变量创建凭证。
 *
 * ## 环境变量
 *
 * ### 阿里云 OSS
 *
 * - `CMTX_ALIYUN_ACCESS_KEY_ID` - 访问密钥 ID
 * - `CMTX_ALIYUN_ACCESS_KEY_SECRET` - 访问密钥 Secret
 * - `CMTX_ALIYUN_BUCKET` - 存储桶名称
 * - `CMTX_ALIYUN_REGION` - 区域（可选，默认 oss-cn-hangzhou）
 *
 * ### 腾讯云 COS
 *
 * - `CMTX_TENCENT_SECRET_ID` - 密钥 ID
 * - `CMTX_TENCENT_SECRET_KEY` - 密钥 Key
 * - `CMTX_TENCENT_BUCKET` - 存储桶名称（格式：bucketname-appid）
 * - `CMTX_TENCENT_REGION` - 区域（可选，默认 ap-guangzhou）
 *
 * @example
 * ```typescript
 * import { createCredentials } from "@cmtx/storage";
 *
 * // 从配置对象创建
 * const aliyunCreds = createCredentials("aliyun-oss", {
 *   accessKeyId: "your-key",
 *   accessKeySecret: "your-secret",
 *   bucket: "my-bucket",
 * });
 *
 * // 从环境变量创建（config 留空或只提供部分字段）
 * const tencentCreds = createCredentials("tencent-cos", {});
 * // 需要设置 CMTX_TENCENT_SECRET_ID, CMTX_TENCENT_SECRET_KEY, CMTX_TENCENT_BUCKET
 * ```
 *
 * @public
 */

import type {
    AliyunCredentials,
    CloudCredentials,
    CloudProvider,
    TencentCredentials,
} from "./types.js";

/**
 * 凭证配置输入
 *
 * @description
 * 用于创建云存储凭证的配置对象。
 * 所有字段均为可选，工厂函数会回退到环境变量。
 *
 * @public
 */
export interface CredentialConfig {
    /** 访问密钥 ID（阿里云） */
    accessKeyId?: string;
    /** 访问密钥 Secret（阿里云） */
    accessKeySecret?: string;
    /** 密钥 ID（腾讯云） */
    secretId?: string;
    /** 密钥 Key（腾讯云） */
    secretKey?: string;
    /** 区域 */
    region?: string;
    /** 存储桶名称 */
    bucket?: string;
}

/**
 * 创建云存储凭证
 *
 * @param provider - 云服务商标识
 * @param config - 凭证配置对象（字段会回退到环境变量）
 * @returns 云存储凭证
 * @throws {Error} 当缺少必填字段时抛出错误
 *
 * @example
 * ```typescript
 * import { createCredentials } from "@cmtx/storage";
 *
 * // 阿里云 OSS - 从配置创建
 * const aliyun = createCredentials("aliyun-oss", {
 *   accessKeyId: "LTAI5t...",
 *   accessKeySecret: "xxx",
 *   bucket: "my-bucket",
 *   region: "oss-cn-hangzhou",
 * });
 *
 * // 腾讯云 COS - 从环境变量创建
 * const tencent = createCredentials("tencent-cos", {});
 * // 需要预先设置环境变量：
 * // CMTX_TENCENT_SECRET_ID, CMTX_TENCENT_SECRET_KEY, CMTX_TENCENT_BUCKET
 * ```
 */
export function createCredentials(
    provider: CloudProvider,
    config: CredentialConfig = {},
): CloudCredentials {
    switch (provider) {
        case "aliyun-oss": {
            return createAliyunCredentials(config);
        }

        case "tencent-cos": {
            return createTencentCredentials(config);
        }

        default:
            throw new Error(
                `不支持的云存储提供商：${String(provider)}。` +
                    `支持的提供商：aliyun-oss, tencent-cos`,
            );
    }
}

/**
 * 创建阿里云凭证
 */
function createAliyunCredentials(config: CredentialConfig): AliyunCredentials {
    const accessKeyId = config.accessKeyId || process.env.CMTX_ALIYUN_ACCESS_KEY_ID || "";
    const accessKeySecret =
        config.accessKeySecret || process.env.CMTX_ALIYUN_ACCESS_KEY_SECRET || "";
    const region = config.region || process.env.CMTX_ALIYUN_REGION || "oss-cn-hangzhou";
    const bucket = config.bucket || process.env.CMTX_ALIYUN_BUCKET || "";

    if (!accessKeyId || !accessKeySecret || !bucket) {
        throw new Error(
            "缺少阿里云 OSS 凭证，请设置以下环境变量或配置：\n" +
                "  - CMTX_ALIYUN_ACCESS_KEY_ID\n" +
                "  - CMTX_ALIYUN_ACCESS_KEY_SECRET\n" +
                "  - CMTX_ALIYUN_BUCKET\n" +
                "  - CMTX_ALIYUN_REGION (可选，默认 oss-cn-hangzhou)",
        );
    }

    return {
        provider: "aliyun-oss",
        accessKeyId,
        accessKeySecret,
        region,
        bucket,
    };
}

/**
 * 创建腾讯云凭证
 */
function createTencentCredentials(config: CredentialConfig): TencentCredentials {
    const secretId = config.secretId || process.env.CMTX_TENCENT_SECRET_ID || "";
    const secretKey = config.secretKey || process.env.CMTX_TENCENT_SECRET_KEY || "";
    const region = config.region || process.env.CMTX_TENCENT_REGION || "ap-guangzhou";
    const bucket = config.bucket || process.env.CMTX_TENCENT_BUCKET || "";

    if (!secretId || !secretKey || !bucket) {
        throw new Error(
            "缺少腾讯云 COS 凭证，请设置以下环境变量或配置：\n" +
                "  - CMTX_TENCENT_SECRET_ID\n" +
                "  - CMTX_TENCENT_SECRET_KEY\n" +
                "  - CMTX_TENCENT_BUCKET (格式：bucketname-appid)\n" +
                "  - CMTX_TENCENT_REGION (可选，默认 ap-guangzhou)",
        );
    }

    return {
        provider: "tencent-cos",
        secretId,
        secretKey,
        region,
        bucket,
    };
}
