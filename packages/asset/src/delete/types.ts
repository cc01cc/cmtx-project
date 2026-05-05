/**
 * Delete 模块类型定义
 *
 * @module delete/types
 * @description
 * 定义图片删除功能所需的所有类型接口和配置结构。
 */

// ==================== 删除策略 ====================

/**
 * 文件删除策略
 *
 * @remarks
 * 定义文件删除的方式：
 * - "trash": 移动到系统回收站（跨平台，推荐）
 * - "move": 移动到指定目录
 * - "hard-delete": 永久删除（谨慎使用）
 * @public
 * @category 图片
 */
export type DeletionStrategy = "trash" | "move" | "hard-delete";

/**
 * 文件删除选项
 *
 * @remarks
 * 配置文件删除的行为
 * @public
 * @category 图片
 */
export interface DeleteFileOptions {
    /** 删除策略 */
    strategy: DeletionStrategy;

    /** 当 strategy 为 move 时的目标目录（绝对路径） */
    trashDir?: string;

    /** 最大重试次数，默认 3 */
    maxRetries?: number;

    /** 基础重试延迟（毫秒），默认 100 */
    baseDelayMs?: number;
}

/**
 * 文件删除结果
 *
 * @remarks
 * 记录删除操作的执行结果
 * @public
 * @category 图片
 */
export interface DeleteFileResult {
    /** 删除状态 */
    status: "success" | "failed" | "skipped";

    /** 重试次数 */
    retries: number;

    /** 错误信息（失败时） */
    error?: string;

    /** 实际使用的策略（trash 失败时可能降级为 move） */
    actualStrategy?: DeletionStrategy;
}

// ==================== 引用信息 ====================

/**
 * 引用信息
 *
 * @description
 * 记录某个图片被哪些 Markdown 文件引用。
 */
export interface ReferenceInfo {
    /** 引用的文件绝对路径 */
    filePath: string;

    /** 引用的文件相对路径（相对于 workspace） */
    relativePath: string;

    /** 引用次数（同一文件中可能多次引用） */
    count: number;
}

// ==================== 删除目标 ====================

/**
 * 删除目标
 *
 * @description
 * 表示一个待删除的图片目标，包含路径和引用信息。
 */
export interface DeleteTarget {
    /** 图片路径（本地绝对路径或远程 URL） */
    path: string;

    /** 是否为本地图片 */
    isLocal: boolean;

    /** 引用该图片的文件列表 */
    referencedIn: ReferenceInfo[];
}

// ==================== 删除配置 ====================

/**
 * 删除选项
 *
 * @public
 */
export interface DeleteOptions {
    /** 删除策略 */
    strategy?: DeletionStrategy;

    /** 回收站目录（当 strategy 为 'move' 时） */
    trashDir?: string;

    /** 最大重试次数，默认 3 */
    maxRetries?: number;

    /** 是否强制删除（忽略引用检查） */
    force?: boolean;

    /** 是否从所有引用的 Markdown 文件中移除图片引用 */
    removeFromMarkdown?: boolean;

    /** 进度回调 */
    onProgress?: (progress: DeleteProgress) => void;
}

/**
 * 删除进度
 */
export interface DeleteProgress {
    /** 当前处理的文件 */
    currentFile?: string;

    /** 已处理的文件数 */
    processedFiles: number;

    /** 总文件数 */
    totalFiles: number;

    /** 当前状态 */
    status: "scanning" | "deleting" | "removing-references" | "complete";
}

// ==================== 删除结果 ====================

/**
 * 删除结果
 *
 * @public
 */
export interface DeleteResult {
    /** 是否成功 */
    success: boolean;

    /** 删除的文件数 */
    deletedCount: number;

    /** 移除引用的文件数 */
    referencesRemovedFrom: number;

    /** 错误信息（如有） */
    error?: string;

    /** 详细结果 */
    details: DeleteDetail[];
}

/**
 * 删除详细结果
 */
export interface DeleteDetail {
    /** 文件路径 */
    path: string;

    /** 是否成功 */
    success: boolean;

    /** 错误信息（如有） */
    error?: string;

    /** 实际使用的策略 */
    actualStrategy?: DeletionStrategy;
}

// ==================== 安全删除类型 ====================

/**
 * 安全删除选项
 *
 * 继承 DeleteOptions 所有字段，用于 DeleteService.safeDelete() 方法。
 * @public
 */
export interface SafeDeleteOptions extends DeleteOptions {
    // 全部继承自 DeleteOptions
}

/**
 * 安全删除详情
 *
 * @public
 */
export interface SafeDeleteDetail {
    /** 引用信息列表 */
    referencedIn: ReferenceInfo[];

    /** 是否有 Markdown 引用 */
    hasReferences: boolean;

    /** 是否因 force 而被强制删除 */
    forceDeleted: boolean;
}

/**
 * 安全删除结果
 *
 * DeleteService.safeDelete() 的返回类型。
 * @public
 */
export interface SafeDeleteResult {
    /** 整体是否成功 */
    success: boolean;

    /** 文件删除阶段是否实际执行 */
    deleted: boolean;

    /** 删除结果（deleted 为 true 时存在） */
    deleteResult?: DeleteResult;

    /** 安全删除详情 */
    detail: SafeDeleteDetail;
}

// ==================== Prune 清理类型 ====================

/**
 * Prune 清理选项
 *
 * @public
 */
export interface PruneOptions {
    /** 删除策略，默认 trash */
    strategy?: DeletionStrategy;

    /** move 策略的目标目录 */
    trashDir?: string;

    /** 文件扩展名过滤（如 ["png", "jpg"]） */
    extensions?: string[];

    /** 最大文件大小（字节），超出则跳过 */
    maxSize?: number;

    /** 是否跳过交互确认（等同于 --yes） */
    yes?: boolean;
}

/**
 * 单张图片的清理结果
 *
 * @public
 */
export interface PruneEntry {
    /** 图片绝对路径 */
    absPath: string;

    /** 文件大小（字节） */
    fileSize: number;

    /** 操作状态 */
    status: "deleted" | "skipped" | "failed";

    /** 错误信息（failed 时） */
    error?: string;

    /** 实际使用的删除策略 */
    actualStrategy?: DeletionStrategy;
}

/**
 * 清理结果汇总
 *
 * @public
 */
export interface PruneResult {
    /** 总 orphan 数 */
    totalOrphans: number;

    /** 成功删除数 */
    deletedCount: number;

    /** 失败数 */
    failedCount: number;

    /** 跳过数 */
    skippedCount: number;

    /** 清理前总字节数 */
    totalSizeBefore: number;

    /** 实际释放字节数 */
    freedSize: number;

    /** 逐图结果 */
    entries: PruneEntry[];
}

// ==================== 服务配置 ====================

/**
 * DeleteService 配置
 */
export interface DeleteServiceConfig {
    /** Workspace 根目录绝对路径 */
    workspaceRoot: string;

    /** 删除选项 */
    options?: DeleteOptions;
}
