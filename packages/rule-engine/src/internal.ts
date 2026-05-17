/**
 * @cmtx/rule-engine/internal
 *
 * 内部 API — 仅供 CMTX monorepo 内部包使用。
 * 此 API 不稳定，随时可能变更，不在语义化版本承诺范围内。
 * 外部项目请勿直接 import 此路径。
 */

// ==================== 服务注册表 ====================
export {
    createServiceRegistry,
    ServiceRegistryImpl,
} from "./rules/services/service-registry-impl.js";

// ==================== 本地服务 ====================
export {
    createFileSystemService,
    FileSystemServiceImpl,
} from "./rules/services/file-system-service.js";

// ==================== 类型定义 ====================
export type {
    BuiltInServiceId,
    FileSystemService,
    FileSystemServiceConfig,
    ServiceRegistry,
    ServiceTypeMap,
} from "./rules/service-registry.js";
