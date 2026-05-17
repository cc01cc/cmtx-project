/**
 * Services 模块
 *
 * @module services
 * @description
 * 提供 ServiceRegistry 实现和本地服务。
 *
 * @internal
 *
 * @remarks
 * ## 设计原则（方案 D）
 *
 * - **Service 类从 @cmtx/asset 导入**：UploadService、DownloadService、TransferService 统一由 asset 包提供
 * - **本地服务**：FileSystemService、ServiceRegistry
 * - **publish 内部封装**：Service 仅用于 Rule 引擎内部，不对外暴露
 *
 * ## 内部使用
 *
 * 此模块的组件不再从 `@cmtx/rule-engine` 的公共入口导出。
 * 内部消费者请从 `@cmtx/rule-engine/internal` 导入。
 */

// ==================== 本地服务（内部使用）====================

export { createFileSystemService } from "./file-system-service.js";
export { createServiceRegistry } from "./service-registry-impl.js";

// ==================== 类型定义（内部使用）====================

export type {
    BuiltInServiceId,
    FileSystemService,
    FileSystemServiceConfig,
    RuleContext,
    ServiceRegistry,
    ServiceTypeMap,
} from "../service-registry.js";
