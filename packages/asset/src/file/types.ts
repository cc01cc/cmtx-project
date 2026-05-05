/**
 * FileService 类型定义
 *
 * @module file/types
 * @description
 * 定义文件操作服务所需的类型接口。
 */

import type { ImageFilterOptions, ImageMatch, ReplaceOptions, ReplaceResult } from "@cmtx/core";
import type { DeleteFileOptions, DeleteFileResult } from "../delete/types.js";

/**
 * 文件信息
 */
export interface FileInfo {
    /** 文件大小（字节） */
    size: number;
    /** 是否是文件 */
    isFile: boolean;
    /** 是否是目录 */
    isDirectory: boolean;
}

/**
 * 目录扫描选项
 */
export interface DirectoryScanOptions {
    /** 匹配模式（glob） */
    patterns?: string[];
    /** 忽略模式（glob） */
    ignore?: string[];
}

/**
 * 本地图片的文件层匹配 — 绝对路径始终已解析
 */
export interface LocalFileImageMatch {
    type: "local";
    /** 来自 core 的原始引用信息 */
    match: ImageMatch;
    /** 来源 Markdown 文件的绝对路径 */
    filePath: string;
    /** 解析出的本地图片绝对路径（恒有值） */
    absPath: string;
}

/**
 * 远程图片的文件层匹配 — 无绝对路径
 */
export interface WebFileImageMatch {
    type: "web";
    /** 来自 core 的原始引用信息 */
    match: ImageMatch;
    /** 来源 Markdown 文件的绝对路径 */
    filePath: string;
}

/** 文件层的图片匹配（按 local/web 拆分） */
export type FileImageMatch = LocalFileImageMatch | WebFileImageMatch;

/** 本地图片分析结果 — type=local 时使用 */
export interface LocalImageEntry {
    type: "local";
    /** 原始 Markdown src（如 `./img.png`） */
    src: string;
    /** 解析出的绝对路径 */
    absPath: string;
    /** 磁盘字节数 */
    fileSize: number;
    /** 引用该图片的 Markdown 文件路径列表 */
    referencedBy: string[];
    /** 是否未被任何 Markdown 文件引用（文件存在但未被引用） */
    orphan: boolean;
}

/** 远程图片分析结果 — type=web 时使用 */
export interface WebImageEntry {
    type: "web";
    /** 原始 URL（如 `https://...`） */
    src: string;
    /** 引用该图片的 Markdown 文件路径列表 */
    referencedBy: string[];
}

/** 单张图片的分析结果（按 local/web 拆分） */
export type ImageEntry = LocalImageEntry | WebImageEntry;

/** 目录图片分析汇总 */
export interface DirectoryAnalysis {
    images: ImageEntry[];
    summary: {
        referenced: number;
        orphan: number;
        totalSize: number;
        mdFiles: number;
    };
}

/** 分析选项 */
export interface AnalyzeOptions {
    extensions?: string[];
    maxSize?: number;
}

// ==================== 替换结果类型 ====================

/**
 * 文件层替换结果
 *
 * @remarks
 * 记录文件层图片替换的结果，包含文件路径、成功状态和替换详情。
 * @public
 * @category 图片
 */
export interface FileReplaceResult {
    /** 文件相对路径 */
    relativePath: string;

    /** 文件绝对路径 */
    absolutePath: string;

    /** 是否成功 */
    success: boolean;

    /** 错误信息（如有） */
    error?: string;

    /** 替换结果 */
    result?: ReplaceResult;
}

/**
 * 目录替换结果统计
 *
 * @remarks
 * 用于 replaceImagesInDirectory 函数的返回值类型
 * @public
 * @category 图片
 */
export interface DirectoryReplaceResult {
    /** 总共处理的文件数 */
    totalFiles: number;
    /** 成功处理的文件数 */
    successfulFiles: number;
    /** 失败的文件数 */
    failedFiles: number;
    /** 总替换次数 */
    totalReplacements: number;
    /** 详细结果 */
    results: FileReplaceResult[];
}

/**
 * 文件服务配置
 */
export interface FileServiceConfig {
    /** 默认删除策略 */
    defaultDeleteStrategy?: DeleteFileOptions["strategy"];
    /** 默认最大重试次数 */
    defaultMaxRetries?: number;
}

/**
 * 文件服务接口
 *
 * @remarks
 * 定义文件操作服务的完整接口，包括：
 * - 图片筛选（从 core 迁移）
 * - 图片替换（从 core 迁移）
 * - 图片删除（从 core 迁移）
 * - 文件适配（从 publish 迁移）
 * - 文件校验（从 publish 迁移）
 * - 文件渲染（从 publish 迁移）
 * - 通用文件操作
 */
export interface IFileService {
    // ==================== 图片筛选（从 core 迁移）====================

    /**
     * 从文件中筛选图片
     * @param fileAbsPath - 文件绝对路径
     * @param options - 筛选选项
     */
    filterImagesFromFile(
        fileAbsPath: string,
        options?: ImageFilterOptions,
    ): Promise<FileImageMatch[]>;

    /**
     * 从目录中批量筛选图片
     * @param dirAbsPath - 目录绝对路径
     * @param options - 筛选选项
     * @param scanOptions - 目录扫描选项
     */
    filterImagesFromDirectory(
        dirAbsPath: string,
        options?: ImageFilterOptions,
        scanOptions?: DirectoryScanOptions,
    ): Promise<FileImageMatch[]>;

    // ==================== 图片替换（从 core 迁移）====================

    /**
     * 在文件中替换图片
     * @param fileAbsPath - 文件绝对路径
     * @param replaceOptions - 替换选项
     */
    replaceImagesInFile(
        fileAbsPath: string,
        replaceOptions: ReplaceOptions[],
    ): Promise<FileReplaceResult>;

    /**
     * 在目录中批量替换图片
     * @param dirAbsPath - 目录绝对路径
     * @param replaceOptions - 替换选项
     * @param scanOptions - 目录扫描选项
     */
    replaceImagesInDirectory(
        dirAbsPath: string,
        replaceOptions: ReplaceOptions[],
        scanOptions?: DirectoryScanOptions,
    ): Promise<DirectoryReplaceResult>;

    // ==================== 图片删除（从 core 迁移）====================

    /**
     * 删除本地图片
     * @param filePath - 图片绝对路径
     * @param options - 删除选项
     */
    deleteLocalImage(filePath: string, options: DeleteFileOptions): Promise<DeleteFileResult>;

    /**
     * 安全删除本地图片（先检查引用再删除）
     * @param imgAbsPath - 图片绝对路径
     * @param rootAbsPath - 根目录绝对路径（用于检查引用）
     * @param options - 删除选项
     */
    deleteLocalImageSafely(
        imgAbsPath: string,
        rootAbsPath: string,
        options: DeleteFileOptions,
    ): Promise<DeleteFileResult>;

    // ==================== 通用文件操作 ====================

    /**
     * 读取文件内容
     * @param filePath - 文件绝对路径
     */
    readFileContent(filePath: string): Promise<string>;

    /**
     * 写入文件内容
     * @param filePath - 文件绝对路径
     * @param content - 文件内容
     */
    writeFileContent(filePath: string, content: string): Promise<void>;

    /**
     * 获取文件信息
     * @param filePath - 文件绝对路径
     */
    getFileInfo(filePath: string): Promise<FileInfo>;

    /**
     * 扫描目录获取文件列表
     * @param dirAbsPath - 目录绝对路径
     * @param options - 扫描选项
     */
    scanDirectory(dirAbsPath: string, options?: DirectoryScanOptions): Promise<string[]>;

    analyzeDirectory(dirAbsPath: string, options?: AnalyzeOptions): Promise<DirectoryAnalysis>;
}
