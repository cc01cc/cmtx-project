/* eslint-disable no-console */

/**
 * 存储适配器工厂
 *
 * @module adapters/factory
 *
 * @description
 * 根据凭证配置创建对应的存储适配器实例。
 *
 * @remarks
 * ## 功能概述
 *
 * - 根据 `provider` 字段自动选择适配器类型
 * - 支持阿里云 OSS 和腾讯云 COS
 * - 自动处理客户端初始化
 *
 * @example
 * ```typescript
 * import { createAdapter } from "@cmtx/storage/adapters/factory";
 *
 * // 创建阿里云 OSS 适配器
 * const aliyunAdapter = createAdapter({
 *   provider: "aliyun-oss",
 *   accessKeyId: "xxx",
 *   accessKeySecret: "xxx",
 *   region: "oss-cn-hangzhou",
 *   bucket: "my-bucket",
 * });
 *
 * // 创建腾讯云 COS 适配器
 * const tencentAdapter = createAdapter({
 *   provider: "tencent-cos",
 *   secretId: "xxx",
 *   secretKey: "xxx",
 *   region: "ap-guangzhou",
 *   bucket: "my-bucket-1250000000",
 * });
 * ```
 */

import type { CloudCredentials, IStorageAdapter } from "../types.js";
import OSS from "ali-oss";
import COS from "cos-nodejs-sdk-v5";
import { AliOSSAdapter } from "./ali-oss.js";
import { TencentCOSAdapter } from "./tencent-cos.js";
import type { CosClient } from "./cos-types.js";

/**
 * 根据凭证配置创建存储适配器
 *
 * @param credentials - 云服务凭证配置
 * @returns 存储适配器实例
 * @throws {Error} 当 provider 不受支持时抛出错误
 *
 * @example
 * ```typescript
 * import { createAdapter } from "@cmtx/storage/adapters/factory";
 *
 * // 阿里云 OSS
 * const ossAdapter = createAdapter({
 *   provider: "aliyun-oss",
 *   accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID!,
 *   accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET!,
 *   region: "oss-cn-hangzhou",
 *   bucket: "my-bucket",
 * });
 *
 * // 腾讯云 COS
 * const cosAdapter = createAdapter({
 *   provider: "tencent-cos",
 *   secretId: process.env.TENCENT_SECRET_ID!,
 *   secretKey: process.env.TENCENT_SECRET_KEY!,
 *   region: "ap-guangzhou",
 *   bucket: "my-bucket-1250000000",
 * });
 * ```
 */
export async function createAdapter(credentials: CloudCredentials): Promise<IStorageAdapter> {
    switch (credentials.provider) {
        case "aliyun-oss": {
            const client = new OSS({
                region: credentials.region,
                accessKeyId: credentials.accessKeyId,
                accessKeySecret: credentials.accessKeySecret,
                stsToken: credentials.stsToken,
                bucket: credentials.bucket,
            });
            return new AliOSSAdapter(client);
        }

        case "tencent-cos": {
            const client = new COS({
                SecretId: credentials.secretId,
                SecretKey: credentials.secretKey,
                SecurityToken: credentials.sessionToken,
            }) as unknown as CosClient;
            return new TencentCOSAdapter(client, {
                Bucket: credentials.bucket,
                Region: credentials.region,
            });
        }

        default:
            throw new Error(
                `Unsupported storage provider: ${(credentials as { provider: string }).provider}. ` +
                    `Supported providers: aliyun-oss, tencent-cos`,
            );
    }
}
