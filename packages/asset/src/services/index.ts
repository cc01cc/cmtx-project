/**
 * Service 层模块导出
 *
 * @module services
 * @description
 * 提供 @cmtx/asset 的 Service 层 API：
 * - Service<TConfig> 接口（唯一定义点）
 * - UploadService — 单存储上传
 * - DownloadService — 多存储下载
 * - TransferService — 跨存储转移
 * - CoreService — 纯文本图片处理
 */

// Service 基础接口
export type { Service } from "./service-registry.js";

// UploadService
export type {
    UploadInvocationOptions,
    UploadResult,
    UploadServiceConfig,
} from "./upload-service.js";
export { UploadService, createUploadService } from "./upload-service.js";

// DownloadService
export type {
    DownloadInvocationOptions,
    DownloadServiceConfig,
    SimpleDownloadResult,
    StorageDomainConfig,
} from "./download-service.js";
export { DownloadService, createDownloadService } from "./download-service.js";

// TransferService
export type {
    TransferInvocationOptions,
    TransferResult,
    TransferServiceConfig,
} from "./transfer-service.js";
export { TransferService, createTransferService } from "./transfer-service.js";

// ==================== 服务（已迁出）====================
// CoreService 已移除：是对 filterImages / updateImageRefs 的薄包装，
// 无生产调用方。直接使用 @cmtx/core 的函数 API 即可。
