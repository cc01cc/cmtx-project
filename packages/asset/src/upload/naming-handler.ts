/**
 * 文件命名处理器 - 处理上传到 OSS 的文件名生成
 *
 * @module naming-handler
 * @description
 * 提供灵活的文件命名和路径生成功能。
 *
 * @remarks
 * ## 核心功能
 *
 * - 生成文件信息（名称、扩展名、大小等）
 * - 计算文件 MD5 哈希值
 * - 根据模板生成远程文件名
 * - 构造完整的远程存储路径
 *
 * ## 模板变量支持
 *
 * ### 基础变量（与 Download 共享）
 * - `{name}` - 文件名（不含扩展名）
 * - `{ext}` - 文件扩展名（不含点）
 * - `{date}` - 当前日期 (YYYY-MM-DD)
 * - `{timestamp}` - 时间戳
 * - `{md5}` - 完整 MD5 哈希
 * - `{md5_8}` - MD5 前 8 位
 * - `{md5_16}` - MD5 前 16 位
 *
 * ### Upload 独有变量
 * - `{fileName}` - 完整文件名
 * - `{year}/{month}/{day}` - 年月日分离
 *
 * ## 使用示例
 *
 * ```typescript
 * // 按日期组织文件
 * namingTemplate: '{date}/{name}.{ext}'
 * // 结果：2025-01-30/photo.png
 *
 * // 带原始名称的哈希命名
 * namingTemplate: '{name}_{md5_8}.{ext}'
 * // 结果：logo_a1b2c3d4.png
 * ```
 *
 * @see {@link generateNameAndRemotePath} - 主要导出函数
 * @see {@link NameTemplateVariables} - 模板变量类型
 * @see {@link @cmtx/template/renderTemplate} - 统一的模板渲染函数
 */

import { readFile, stat } from "node:fs/promises";
import { basename, extname } from "node:path";
import type { LocalFileImageMatch } from "../file/types.js";
import { renderTemplate } from "@cmtx/template";
import { dummyLogger, type Logger } from "@cmtx/core";
import { DEFAULT_NAMING_TEMPLATE, generateMD5 } from "../shared/index.js";
import type { BaseNamingVariables } from "../shared/types.js";
import type { StorageConfig } from "./config.js";

/**
 * 文件信息接口（向后兼容导出）
 */
export interface FileInfo {
    /** 完整文件路径 */
    fullPath: string;
    /** 文件路径 (不含文件名) */
    dirPath: string;
    /** 文件名（包含扩展名）*/
    fileName: string;
    /** 文件名（不含扩展名）*/
    name: string;
    /** 文件扩展名（不含点）*/
    ext: string;
    /** 文件大小（字节）*/
    size: number;
}

/**
 * 生成文件信息（向后兼容导出）
 */
export async function getFileInfo(localPath: string): Promise<FileInfo> {
    const fileName = basename(localPath);
    const extWithDot = extname(localPath);
    const ext = extWithDot.slice(1); // 移除点
    const name = extWithDot ? fileName.slice(0, fileName.length - extWithDot.length) : fileName;
    const dirPath = localPath.slice(0, localPath.length - fileName.length);
    // 获取文件统计信息
    const stats = await stat(localPath);

    return {
        fullPath: localPath,
        dirPath,
        fileName,
        name,
        ext,
        size: stats.size, // 文件大小（字节）
    };
}

/**
 * Upload 命名模板变量
 *
 * @description
 * 继承基础变量，添加 Upload 独有的变量。
 *
 * ## 基础变量（继承自 BaseNamingVariables）
 * - `{name}` - 文件名（不含扩展名）
 * - `{ext}` - 文件扩展名（不含点）
 * - `{date}` - 日期（YYYY-MM-DD）
 * - `{timestamp}` - 时间戳
 * - `{md5}` - 完整 MD5 哈希
 * - `{md5_8}` - MD5 前 8 位
 * - `{md5_16}` - MD5 前 16 位
 *
 * ## Upload 独有变量
 * - `{fileName}` - 完整文件名（含扩展名）
 * - `{year}` - 年（4 位）
 * - `{month}` - 月（2 位，01-12）
 * - `{day}` - 日（2 位，01-31）
 */
export interface NameTemplateVariables extends BaseNamingVariables {
    /** 完整文件名（含扩展名） */
    fileName: string;

    /** 年（4 位） */
    year: string;

    /** 月（2 位，01-12） */
    month: string;

    /** 日（2 位，01-31） */
    day: string;
}

export function warnAndCleanUnresolved(imageName: string, logger?: Logger): string {
    const log = logger ?? dummyLogger;
    const unresolved = imageName.match(/\{([^}]+)\}/g);
    if (unresolved) {
        for (const placeholder of unresolved) {
            const varName = placeholder.slice(1, -1);
            log.warn(`[NamingHandler] 未知变量: {${varName}}`);
        }
        return imageName.replace(/\{[^}]+\}/g, "");
    }
    return imageName;
}

/**
 * 根据命名模式生成远程文件名
 */
export function generateRemoteImageName(
    fileInfo: FileInfo,
    imageData: Buffer,
    storage: StorageConfig,
    logger: Logger = dummyLogger,
): string {
    const namingTemplate = storage.namingTemplate || DEFAULT_NAMING_TEMPLATE;

    // 填充模板变量
    const variables: NameTemplateVariables = {
        name: fileInfo.name,
        ext: fileInfo.ext,
        fileName: fileInfo.fileName,
        date: new Date().toISOString().slice(0, 10),
        timestamp: Date.now().toString(),
        year: new Date().getFullYear().toString(),
        month: (new Date().getMonth() + 1).toString().padStart(2, "0"),
        day: new Date().getDate().toString().padStart(2, "0"),
        md5: generateMD5(imageData),
        md5_8: generateMD5(imageData, 8),
        md5_16: generateMD5(imageData, 16),
    };

    const imageName = renderTemplate(namingTemplate, variables, {
        postProcess: (result) => result.replace(/\/+/g, "/"),
    });

    return warnAndCleanUnresolved(imageName, logger);
}

/**
 * 生成完整的远程路径
 */
export async function generateNameAndRemotePath(
    localImageWithAbs: LocalFileImageMatch,
    storageOptions: StorageConfig,
    prefix?: string,
    logger: Logger = dummyLogger,
): Promise<{
    name: string;
    remotePath: string;
    nameTemplateVariables: NameTemplateVariables;
}> {
    const fileInfo = await getFileInfo(localImageWithAbs.absPath);

    try {
        const imageData = await readFile(localImageWithAbs.absPath);

        // 生成模板变量
        const variables: NameTemplateVariables = {
            name: fileInfo.name,
            ext: fileInfo.ext,
            fileName: fileInfo.fileName,
            date: new Date().toISOString().slice(0, 10),
            timestamp: Date.now().toString(),
            year: new Date().getFullYear().toString(),
            month: (new Date().getMonth() + 1).toString().padStart(2, "0"),
            day: new Date().getDate().toString().padStart(2, "0"),
            md5: generateMD5(imageData),
            md5_8: generateMD5(imageData, 8),
            md5_16: generateMD5(imageData, 16),
        };

        const rendered = renderTemplate(
            storageOptions.namingTemplate || DEFAULT_NAMING_TEMPLATE,
            variables,
            {
                postProcess: (result) => result.replace(/\/+/g, "/"),
            },
        );
        const imageName = warnAndCleanUnresolved(rendered, logger);

        // 构造最终路径
        const normalizedPrefix = (prefix || "").endsWith("/") ? prefix : prefix ? `${prefix}/` : "";
        return {
            name: imageName,
            remotePath: `${normalizedPrefix}${imageName}`,
            nameTemplateVariables: variables,
        };
    } catch (error) {
        throw new Error(
            `Failed to read file at ${localImageWithAbs.absPath}: ${(error as Error).message}`,
            { cause: error },
        );
    }
}
