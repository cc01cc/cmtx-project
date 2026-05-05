/**
 * Services 模块
 *
 * @module services
 * @description
 * 提供 ServiceRegistry 实现和本地服务。
 *
 * @remarks
 * ## 设计原则（方案 D）
 *
 * - **Service 类从 @cmtx/asset 导入**：AssetService、CoreService 统一由 asset 包提供
 * - **本地服务**：CounterService、CallbackService、FileSystemService、ServiceRegistry
 * - **publish 内部封装**：Service 仅用于 Rule 引擎内部，不对外暴露

## 服务来源

 * - **外部**: AssetService、CoreService（从 @cmtx/asset 导入）
 * - **本地**: CounterService、CallbackService、FileSystemService、ServiceRegistry
 */

// ==================== 本地服务 ====================

/**
 * @category 本地服务
 */
export { CallbackServiceImpl, createCallbackService } from "./callback-service.js";

/**
 * @category 本地服务
 */
export { CounterServiceImpl, createCounterService } from "./counter-service.js";

/**
 * @category 本地服务
 */
export { FileSystemServiceImpl, createFileSystemService } from "./file-system-service.js";
/**
 * @category 本地服务
 */
export { createServiceRegistry, ServiceRegistryImpl } from "./service-registry-impl.js";

// ==================== 类型定义 ====================

/**
 * @category 类型定义
 */
export type {
    BuiltInServiceId,
    CallbackService,
    CallbackServiceConfig,
    CoreContext,
    CounterService,
    CounterServiceConfig,
    FileSystemService,
    FileSystemServiceConfig,
    AssetRef,
    PresignedUrlService,
    PresignedUrlServiceConfig,
    RuleContext,
    ServiceRegistry,
    ServiceTypeMap,
} from "../service-registry.js";
