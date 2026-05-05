/**
 * Rule 系统类型定义
 *
 * @module rule-types
 * @description
 * 提供统一的 Rule 接口和类型定义，支持文本替换、图片处理、元数据处理等多种操作。
 */

import type { ServiceRegistry } from "./service-registry.js";

// ==================== 外部类型（从 @cmtx/asset 导入）====================
export type { ConflictResolutionStrategy } from "@cmtx/asset/upload";
export type { IStorageAdapter } from "@cmtx/storage";
// 重新导出服务相关类型
export type {
    CallbackService,
    CallbackServiceConfig,
    CoreContext,
    CounterService,
    CounterServiceConfig,
    PresignedUrlService,
    PresignedUrlServiceConfig,
    StorageServiceConfig,
} from "./service-registry.js";
// ==================== Service 类型（从 @cmtx/asset 统一导入）====================
export type {
    CoreService,
    CoreServiceConfig,
    DownloadAssetsService,
    DownloadAssetsServiceConfig,
    TransferAssetsService,
    TransferAssetsServiceConfig,
    UploadResult,
    UploadService,
    UploadServiceConfig,
} from "@cmtx/asset";
/** @deprecated 使用 UploadService / DownloadAssetsService / TransferAssetsService 替代 */
export type { AssetService, AssetServiceConfig } from "@cmtx/asset";
// 重新导出 Service 接口（从 service-registry.js，最终来源是 @cmtx/asset）
export type { Service } from "./service-registry.js";

/**
 * Rule 执行上下文
 * 包含执行 Rule 所需的所有上下文信息
 *
 * 新设计：使用 ServiceRegistry 模式，通过 services 获取扩展能力
 * 核心数据（document, filePath, baseDirectory）保持不变
 * 扩展能力（storage, counter, callbacks 等）通过 services.get() 获取
 */
export interface RuleContext {
    /** 当前文档内容 */
    document: string;

    /** 文件路径 */
    filePath: string;

    /** 基础目录（可选，未提供时使用 filePath 的目录） */
    baseDirectory?: string;

    /**
     * 服务注册表
     * 通过 services.get<T>() 获取所需服务
     */
    services: ServiceRegistry;

    /** 是否 dry-run 模式 */
    dryRun?: boolean;

    /** 调用方输入参数 */
    input?: Record<string, string>;

    /** 其他配置项 */
    [key: string]: unknown;
}

/**
 * Rule 执行结果
 */
export interface RuleResult {
    /** 处理后的内容 */
    content: string;

    /** 是否修改了内容 */
    modified: boolean;

    /** 处理消息/日志 */
    messages?: string[];
}

/**
 * Rule 接口
 * 所有 Rule 必须实现此接口
 */
export interface Rule {
    /** Rule 唯一标识 */
    id: string;

    /** Rule 显示名称 */
    name: string;

    /** Rule 描述 */
    description?: string;

    /**
     * 执行 Rule
     * @param context - 执行上下文
     * @param config - Rule 特定配置
     * @returns Rule 执行结果
     */
    execute(context: RuleContext, config?: unknown): Promise<RuleResult> | RuleResult;
}

/**
 * Rule 步骤配置（用于 Preset 中的步骤）
 */
export interface RuleStepConfig {
    /** Rule ID */
    id: string;

    /** 是否启用，默认 true */
    enabled?: boolean;

    /** Rule 特定配置 */
    config?: Record<string, unknown>;
}

/**
 * Rule 配置（用于全局 rules 配置）
 * 直接是配置参数，不包含 enabled
 */
export interface RuleConfig {
    [key: string]: unknown;
}

/**
 * Preset 配置（Rule 集合）
 */
export interface PresetConfig {
    /** Preset ID */
    id: string;

    /** Preset 显示名称 */
    name: string;

    /** Preset 描述 */
    description?: string;

    /** Rule 步骤配置列表 */
    steps: RuleStepConfig[];
}

/**
 * 简洁版 Preset（仅 Rule ID 列表）
 */
export type SimplePreset = string[];

/**
 * 完整的 Presets 配置
 */
export interface PresetsConfig {
    [presetId: string]: PresetConfig | SimplePreset;
}

/**
 * 全局 Rules 配置
 * 每个 Rule 直接对应其配置参数
 */
export interface GlobalRulesConfig {
    [ruleId: string]: RuleConfig;
}

/**
 * 简洁版 Preset 步骤（仅 Rule ID 列表）
 * 实际使用时会被转换为 RuleStepConfig[]
 */
export type SimplePresetStep = string;

/**
 * 文本替换 Rule 配置
 */
export interface TextReplaceRuleConfig {
    /** 正则表达式 */
    match: string;

    /** 替换字符串 */
    replace: string;

    /** 正则标志 */
    flags?: string;
}

/**
 * 图片处理 Rule 配置
 */
export interface ImageProcessRuleConfig {
    /** 是否转换为 HTML */
    convertToHtml?: boolean;

    /** 图片宽度 */
    width?: number;

    /** 是否上传 */
    upload?: boolean;
}

/**
 * Frontmatter Rule 配置
 */
export interface FrontmatterRuleConfig {
    /** 标题级别 */
    headingLevel?: number;

    /** 加密密钥（用于 ID 生成） */
    encryptionKey?: string;
}

/**
 * Rule 注册表
 */
export interface RuleRegistry {
    /** 获取 Rule */
    get(id: string): Rule | undefined;

    /** 注册 Rule */
    register(rule: Rule): void;

    /** 获取所有 Rule ID */
    getAllIds(): string[];
}

/**
 * 重新导出 ServiceRegistry 和 ServiceTypeMap
 */
export type { ServiceRegistry, ServiceTypeMap } from "./service-registry.js";
