/**
 * @cmtx/asset/transfer - Markdown 远程图片转移
 *
 * @packageDocumentation
 * @module @cmtx/asset/transfer
 *
 * @description
 * 提供将 Markdown 中引用的远程图片从一个对象存储转移到另一个的功能。
 *
 * @remarks
 * ## 核心功能
 *
 * ### 图片转移
 * - 扫描 Markdown 文件中的远程图片引用
 * - 识别属于源存储的 URL
 * - 下载并上传到目标存储
 * - 自动替换 Markdown 中的图片引用
 *
 * ### 并发控制
 * - 支持并发传输控制
 * - 进度跟踪和回调
 * - 错误处理和重试
 *
 * ### 临时文件管理
 * - 自动创建和清理临时文件
 * - 磁盘空间检查
 * - 异常时自动清理
 *
 * ## 快速开始
 *
 * ```typescript
 * import { transferRemoteImages, TransferConfigBuilder } from "@cmtx/asset/transfer";
 * import { AliOSSAdapter } from "@cmtx/storage/adapters/ali-oss";
 * import OSS from "ali-oss";
 *
 * // 1. 配置源存储适配器
 * const sourceAdapter = new AliOSSAdapter(
 *   new OSS({
 *     region: "oss-cn-hangzhou",
 *     accessKeyId: "source-key",
 *     accessKeySecret: "source-secret",
 *     bucket: "source-bucket"
 *   })
 * );
 *
 * // 2. 配置目标存储适配器
 * const targetAdapter = new AliOSSAdapter(
 *   new OSS({
 *     region: "oss-cn-beijing",
 *     accessKeyId: "target-key",
 *     accessKeySecret: "target-secret",
 *     bucket: "target-bucket"
 *   })
 * );
 *
 * // 3. 构建传输配置
 * const config = new TransferConfigBuilder()
 *   .source(sourceAdapter, {
 *     customDomain: "https://private.example.com"
 *   })
 *   .target(targetAdapter, {
 *     customDomain: "https://cdn.example.com",
 *     prefix: "images/",
 *     namingStrategy: "preserve"
 *   })
 *   .options({
 *     concurrency: 5,
 *     onProgress: (progress) => {
 *       console.log(`${progress.current}/${progress.total}: ${progress.fileName}`);
 *     }
 *   })
 *   .build();
 *
 * // 4. 执行传输
 * const result = await transferRemoteImages("/path/to/article.md", config);
 *
 * console.log(`Transferred ${result.success} images`);
 * console.log(`Failed: ${result.failed}`);
 * console.log(`Skipped: ${result.skipped}`);
 * ```
 *
 * @see {@link transferRemoteImages} - 主要传输函数
 * @see {@link TransferConfigBuilder} - 配置构建器
 * @see {@link @cmtx/storage} - 存储适配器（独立包）
 */

// URL 解析器
export {
    createUrlParser,
    type ParsedUrl,
    UrlParser,
    type UrlParserConfig,
} from '../utils/url-parser.js';
// 核心功能
export {
    createTransferManager,
    TransferManager,
    transferRemoteImages,
} from './transfer-manager.js';
// 传输服务
export {
    createTransferService,
    TransferService,
} from './transfer-service.js';
// 类型定义
export type {
    CloudCredentials,
    FileFilter,
    InternalSourceConfig,
    InternalTargetConfig,
    InternalTransferConfig,
    SourceConfig,
    TargetConfig,
    TransferConfig,
    TransferEvent,
    TransferEventType,
    TransferOptions,
    TransferProgress,
    TransferResult,
    UrlMapping,
} from './types.js';
// 配置构建器
export { TransferConfigBuilder } from './types.js';
// URL 转换器
export {
    createUrlTransformer,
    UrlTransformer,
} from './url-transformer.js';
