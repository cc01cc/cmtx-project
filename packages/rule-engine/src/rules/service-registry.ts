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
    input?: Record<string, string>;
}

/**
 * 存储服务配置
 *
 * @TODO 技术债务：检查此接口与 @cmtx/storage 的 StorageServiceConfig 是否存在冗余设计
 */
export interface StorageServiceConfig {
    /** 适配器类型 */
    adapter: string;
    /** 适配器配置 */
    config: Record<string, string>;
    /** 前缀 */
    prefix?: string;
}

/**
 * 存储服务接口
 * 提供图片上传等存储相关功能
 */
export interface StorageService extends Service<StorageServiceConfig> {
    readonly id: "storage";

    /**
     * 上传文件
     * @param localPath - 本地文件路径
     * @param remotePath - 远程路径
     * @returns 远程 URL
     */
    upload(localPath: string, remotePath: string): Promise<string>;

    /**
     * 获取存储配置
     */
    getConfig(): StorageServiceConfig;
}

/**
 * 计数器服务配置
 */
export interface CounterServiceConfig {
    /** 初始值 */
    initialValue?: number;
    /** 步长 */
    step?: number;
}

/**
 * 计数器服务接口
 * 提供计数器功能，用于 ID 生成
 */
export interface CounterService extends Service<CounterServiceConfig> {
    readonly id: "counter";

    /**
     * 获取下一个计数值
     */
    next(): number;

    /**
     * 获取当前值
     */
    current(): number;

    /**
     * 重置计数器
     * @param value - 重置值
     */
    reset(value?: number): void;
}

/**
 * 回调服务配置
 */
export interface CallbackServiceConfig {
    /**
     * 文件已存在时的冲突处理回调
     */
    onFileExists?: (
        fileName: string,
        remotePath: string,
        remoteUrl: string,
    ) => Promise<"skip" | "replace" | "download">;

    /**
     * 进度回调
     */
    onProgress?: (message: string) => void;
}

/**
 * 回调服务接口
 * 提供用户交互相关的回调功能
 */
export interface CallbackService extends Service<CallbackServiceConfig> {
    readonly id: "callback";

    /**
     * 文件已存在时的冲突处理
     */
    onFileExists?(
        fileName: string,
        remotePath: string,
        remoteUrl: string,
    ): Promise<"skip" | "replace" | "download">;

    /**
     * 进度回调
     */
    onProgress?(message: string): void;
}

/**
 * 预签名 URL 服务配置
 */
export interface PresignedUrlServiceConfig {
    /** 过期时间（秒） */
    expire?: number;
    /** 最大重试次数 */
    maxRetryCount?: number;
    /** 图片格式 */
    imageFormat?: "markdown" | "html" | "all";
    /** 域名配置 */
    domains?: Array<{
        domain: string;
        provider: string;
        bucket?: string;
        region?: string;
        path?: string;
        accessKeyId?: string;
        accessKeySecret?: string;
    }>;
}

/**
 * 预签名 URL 服务接口
 * 提供预签名 URL 转换功能
 */
export interface PresignedUrlService extends Service<PresignedUrlServiceConfig> {
    readonly id: "presigned-url";

    /**
     * 转换 Markdown 中的 URL 为预签名 URL
     * @param markdown - Markdown 内容
     * @returns 转换后的内容
     */
    transform(markdown: string): Promise<string>;

    /**
     * 获取配置
     */
    getConfig(): PresignedUrlServiceConfig;
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
    readFileFrontMatter(path: string): Promise<Record<string, string>>;

    /** 更新文件的 front matter 字段 */
    updateFileFrontMatter(path: string, fields: Record<string, string>): Promise<void>;

    /** 检测目录所属的 workspace 根目录 */
    detectWorkspaceRoot(path: string): Promise<string | null>;

    /** 判断两个路径是否属于同一 workspace */
    isSameWorkspace(pathA: string, pathB: string): Promise<boolean>;
}

/**
 * 内置服务 ID 类型
 * 用于类型安全的服务获取
 */
export type BuiltInServiceId = "storage" | "counter" | "callback" | "presigned-url" | "filesystem";

/**
 * 服务 ID 到服务类型的映射
 * 用于类型推断
 */
export interface ServiceTypeMap {
    storage: StorageService;
    counter: CounterService;
    callback: CallbackService;
    "presigned-url": PresignedUrlService;
    filesystem: FileSystemService;
}
