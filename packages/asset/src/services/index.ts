/**
 * Asset Service 模块导出
 *
 * @module services
 * @description
 * 提供 @cmtx/asset 的 Service 模式接口（Facade 模式）。
 */

export type { AssetServiceConfig } from "./asset-service.js";
export { AssetService, createAssetService } from "./asset-service.js";
export type { Service } from "./service-registry.js";
