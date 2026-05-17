/**
 * Service Registry 类型定义
 *
 * @module service-registry
 * @description
 * 提供服务注册表的核心接口，支持可扩展的服务注册和获取机制。
 * 采用 Service Locator 模式，允许 Rule 按需获取服务而不依赖具体实现。
 */

// Service 接口从 @cmtx/asset 统一导入（唯一定义点）
import type { Service } from "@cmtx/asset";
import type { FrontmatterValue } from "@cmtx/core";
// Service 类型在 rule-engine 内部使用，也导出供需要类型引用的场景
export type { Service } from "@cmtx/asset";

/**
 * 服务注册表接口
 * 核心设计：不随服务类型扩展，保持稳定
 */
export interface ServiceRegistry {
    /**
     * 注册服务
     * @param service - 服务实例
     */
    register<T>(service: Service<T>): void;

    /**
     * 获取服务
     * @param id - 服务标识
     * @returns 服务实例或 undefined
     */
    get<T extends Service>(id: string): T | undefined;

    /**
     * 检查服务是否存在
     * @param id - 服务标识
     */
    has(id: string): boolean;

    /**
     * 获取所有已注册的服务 ID
     */
    getAllIds(): string[];
}

/**
 * 核心上下文
 * 只包含所有 Rule 都需要的通用数据，永不膨胀
 */
export interface CoreContext {
    /** 当前文档内容 */
    document: string;

    /** 文件路径 */
    filePath: string;

    /** 基础目录（可选，未提供时使用 filePath 的目录） */
    baseDirectory?: string;
}

/**
 * Rule 执行上下文
 * 继承 CoreContext，通过 services 获取扩展能力
 */
export interface RuleContext extends CoreContext {
    /** 服务注册表 */
    services: ServiceRegistry;

    /** 是否 dry-run 模式（文件级 Rule 应跳过写入） */
    dryRun?: boolean;

    /** 调用方输入参数（来自 CLI / VS Code / MCP） */
    input?: Record<string, FrontmatterValue>;
}

/**
 * 文件系统服务配置
 */
export interface FileSystemServiceConfig {
    /** 基础目录 */
    baseDir?: string;
}

/**
 * Asset 引用类型
 *
 * @internal
 */
export interface AssetRef {
    /** 源文件中的相对路径 */
    originalPath: string;
    /** 解析后的绝对路径 */
    absolutePath: string;
    /** 文件名 */
    basename: string;
}

/**
 * 文件系统服务接口
 * 为文件级 Rule 提供文件操作能力
 */
export interface FileSystemService extends Service<FileSystemServiceConfig> {
    readonly id: "filesystem";

    /** 创建目录（递归） */
    createDirectory(path: string): Promise<void>;

    /** 写入文件 */
    writeFile(path: string, content: string): Promise<void>;

    /** 复制文件 */
    copyFile(src: string, dest: string): Promise<void>;

    /** 扫描 MD 内容中的本地 asset 引用 */
    scanAssets(sourceDir: string, mdContent: string): Promise<AssetRef[]>;

    /** 读取文件的 front matter */
    readFileFrontMatter(path: string): Promise<Record<string, FrontmatterValue>>;

    /** 更新文件的 front matter 字段 */
    updateFileFrontMatter(path: string, fields: Record<string, FrontmatterValue>): Promise<void>;

    /** 检测目录所属的 workspace 根目录 */
    detectWorkspaceRoot(path: string): Promise<string | null>;

    /** 判断两个路径是否属于同一 workspace */
    isSameWorkspace(pathA: string, pathB: string): Promise<boolean>;
}

/**
 * 内置服务 ID 类型
 * 用于类型安全的服务获取
 */
export type BuiltInServiceId = "filesystem";

/**
 * 服务 ID 到服务类型的映射
 * 用于类型推断
 */
export interface ServiceTypeMap {
    filesystem: FileSystemService;
}
