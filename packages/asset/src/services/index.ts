/**
 * Service 层模块导出
 *
 * @module services
 * @description
 * 提供 @cmtx/asset 的 Service 层 API：
 * - Service<TConfig> 接口（唯一定义点）
 * - UploadService — 单存储上传
 * - DownloadAssetsService — 多存储下载
 * - TransferAssetsService — 跨存储转移
 * - CoreService — 纯文本图片处理
 */

// Service 基础接口
export type { Service } from "./service-registry.js";

// UploadService
export type { UploadResult, UploadServiceConfig } from "./upload-service.js";
export { UploadService, createUploadService } from "./upload-service.js";

// DownloadAssetsService
export type {
    DownloadAssetsServiceConfig,
    SimpleDownloadResult,
    StorageDomainConfig,
} from "./download-assets-service.js";
export { DownloadAssetsService, createDownloadAssetsService } from "./download-assets-service.js";

// TransferAssetsService
export type {
    TransferAssetsResult,
    TransferAssetsServiceConfig,
} from "./transfer-assets-service.js";
export { TransferAssetsService, createTransferAssetsService } from "./transfer-assets-service.js";

// CoreService
export type { CoreServiceConfig } from "./core-service.js";
export { CoreService, createCoreService } from "./core-service.js";

// 保留旧 AssetService 导出（deprecated，待删除）
/** @deprecated 使用 UploadService / DownloadAssetsService / TransferAssetsService 替代 */
export type { AssetServiceConfig } from "./asset-service.js";
/** @deprecated 使用 createUploadService / createDownloadAssetsService / createTransferAssetsService 替代 */
export { AssetService, createAssetService } from "./asset-service.js";
