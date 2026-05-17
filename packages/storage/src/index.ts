/**
 * @cmtx/storage - 对象存储适配器
 *
 * @packageDocumentation
 * @module @cmtx/storage
 *
 * @description
 * 提供对象存储服务的抽象接口和具体实现。
 *
 * ## 支持的存储服务
 *
 * - 阿里云 OSS ({@link AliyunOSSAdapter})
 * - 腾讯云 COS ({@link TencentCOSAdapter})
 * - AWS S3 (计划中)
 * - MinIO (计划中)
 *
 * ## 快速开始
 *
 * ### 阿里云 OSS
 *
 * ```typescript
 * import { AliyunOSSAdapter } from "@cmtx/storage/adapters/ali-oss";
 * import OSS from "ali-oss";
 *
 * const client = new OSS({
 *   region: "oss-cn-hangzhou",
 *   accessKeyId: "your-key",
 *   accessKeySecret: "your-secret",
 *   bucket: "your-bucket"
 * });
 *
 * const adapter = new AliyunOSSAdapter(client);
 * const result = await adapter.upload("/path/to/file.png", "images/file.png");
 * console.log(result.url);
 * ```
 *
 * ### 腾讯云 COS
 *
 * ```typescript
 * import { TencentCOSAdapter } from "@cmtx/storage/adapters/tencent-cos";
 * import COS from "cos-nodejs-sdk-v5";
 *
 * const cos = new COS({
 *   SecretId: "your-secret-id",
 *   SecretKey: "your-secret-key",
 * });
 *
 * const adapter = new TencentCOSAdapter(cos, {
 *   Bucket: "your-bucket-1250000000",
 *   Region: "ap-guangzhou",
 * });
 *
 * const result = await adapter.upload("/path/to/file.png", "images/file.png");
 * console.log(result.url);
 * ```
 *
 * ### 使用工厂函数
 *
 * ```typescript
 * import { createAdapter } from "@cmtx/storage/adapters/factory";
 *
 * const adapter = createAdapter({
 *   provider: "tencent-cos",
 *   secretId: "your-secret-id",
 *   secretKey: "your-secret-key",
 *   region: "ap-guangzhou",
 *   bucket: "your-bucket-1250000000",
 * });
 * ```
 *
 * @public
 */

// ==================== 类型定义 ====================

/**
 * @category 类型定义
 */
export type {
    AdapterUploadResult,
    AliyunCredentials,
    CloudCredentials,
    CloudProvider,
    CloudStorageConfig,
    StorageAdapter,
    ObjectMeta,
    TencentCredentials,
    UploadBufferOptions,
} from "./types.js";

// ==================== 凭证工厂 ====================

export { createCredentials } from "./credentials.js";
export type { CredentialConfig } from "./credentials.js";

// ==================== URL 检测工具 ====================

/**
 * URL 检测工具从 `@cmtx/asset` 迁入，仅保留 `isStorageUrl` 作为公开 API。
 * 其余函数（detectStorageUrl、isAliyunOssUrl 等）已内部化，
 * 需要时可从 `./url-detector.js` 直接导入。
 */
export { isStorageUrl } from "./url-detector.js";
export type { StorageUrlDetectOptions } from "./url-detector.js";
