/**
 * FileService 类型定义
 *
 * @module file/types
 * @description
 * 定义文件操作服务所需的类型接口。
 */

import type {
    DeleteFileOptions,
    DeleteFileResult,
    DirectoryReplaceResult,
    FileReplaceResult,
    ImageFilterOptions,
    ImageMatch,
    ReplaceOptions,
} from "@cmtx/core";

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
    filterImagesFromFile(fileAbsPath: string, options?: ImageFilterOptions): Promise<ImageMatch[]>;

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
    ): Promise<ImageMatch[]>;

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
}
