/**
 * Delete 模块类型定义
 *
 * @module delete/types
 * @description
 * 定义图片删除功能所需的所有类型接口和配置结构。
 */

import type { DeletionStrategy } from "@cmtx/core";

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
