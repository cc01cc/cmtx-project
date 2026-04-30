/**
 * Services 模块
 *
 * @module services
 * @description
 * 提供内置服务实现和 ServiceRegistry 实现。
 *
 * @remarks
 * ## 设计原则（方案 D）
 *
 * - **内部封装 Service**：CoreService 和 AssetService 在 publish 内部实现包装
 * - **core/asset 只提供函数 API**：保持底层包 API 纯净
 * - **publish 内部封装**：Service 仅用于 Rule 引擎内部，不对外暴露
 * - **保留本地服务**：CounterService、CallbackService 等简单服务
 * - **ServiceRegistry**：提供服务注册和获取机制
 *
 * ## 服务来源
 *
 * - **内部包装**: CoreService（包装 @cmtx/core 函数 API）
 * - **内部包装**: AssetService（包装 @cmtx/asset 函数 API）
 * - **本地**: CounterService、CallbackService、ServiceRegistry
 */

// ==================== 内部 Service 包装（仅供 Rule 引擎使用）====================

export type {
    AssetServiceConfig,
    SimpleDownloadResult,
    TransferResult,
    UploadResult,
} from "./asset-service-wrapper.js";
/**
 * @category 内部服务
 */
export { AssetService, createAssetService } from "./asset-service-wrapper.js";
export type { CoreServiceConfig } from "./core-service-wrapper.js";
/**
 * @category 内部服务
 */
export { CoreService, createCoreService } from "./core-service-wrapper.js";

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
    PresignedUrlService,
    PresignedUrlServiceConfig,
    RuleContext,
    Service,
    ServiceRegistry,
    ServiceTypeMap,
} from "../service-registry.js";
