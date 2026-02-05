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
 * - `{name}` - 文件名（不含扩展名）
 * - `{ext}` - 文件扩展名
 * - `{fileName}` - 完整文件名
 * - `{date}` - 当前日期 (YYYY-MM-DD)
 * - `{timestamp}` - 时间戳
 * - `{year}/{month}/{day}` - 年月日
 * - `{md5}` - 完整 MD5 哈希
 * - `{md5_8}` - MD5 前 8 位
 * - `{md5_16}` - MD5 前 16 位
 *
 * ## 使用示例
 *
 * ```typescript
 * // 按日期组织文件
 * namingTemplate: '{date}/{md5_8}{ext}'
 * // 结果：2025-01-30/a1b2c3d4.png
 *
 * // 带原始名称的哈希命名
 * namingTemplate: '{name}_{md5_8}{ext}'
 * // 结果：logo_a1b2c3d4.png
 * ```
 *
 * @see {@link generateNameAndRemotePath} - 主要导出函数
 * @see {@link NameTemplateVariables} - 模板变量类型
 * @see {@link renderTemplateSimple} - 模板渲染函数
 */

import { basename, extname } from 'node:path';
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import type { StorageOptions } from './types.js';
import { LocalImageMatchWithAbsPath } from '@cmtx/core';
import { renderTemplateSimple } from './template-renderer.js';

/**
 * 文件信息接口
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
    /** 文件扩展名（包含点号）*/
    ext: string;
    /** 文件大小（字节）*/
    size: number;
}

/**
 * 生成文件信息
 */
export async function getFileInfo(localPath: string): Promise<FileInfo> {
    const fileName = basename(localPath);
    const ext = extname(localPath);
    const name = fileName.slice(0, fileName.length - ext.length);
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
 * 生成 MD5 哈希
 */
export function generateMD5(content: string | Buffer, length: number = 8): string {
    const hash = createHash('md5');
    hash.update(content);
    return hash.digest('hex').slice(0, length);
}

// 定义模板变量 - 继承 Record<string, string> 以兼容通用模板渲染函数
export interface NameTemplateVariables extends Record<string, string> {
    name: string;
    ext: string;
    fileName: string;
    date: string;
    timestamp: string;
    year: string;
    month: string;
    day: string;
    md5: string;
    md5_8: string;
    md5_16: string;
}

/**
 * 根据命名模式生成远程文件名
 */
export function generateRemoteImageName(fileInfo: FileInfo, imageData: Buffer, storage: StorageOptions): string {
    const namingTemplate = storage.namingTemplate || '{fileName}';

    // 填充模板变量
    const variables: NameTemplateVariables = {
        name: fileInfo.name,
        ext: fileInfo.ext,
        fileName: fileInfo.fileName,
        date: new Date().toISOString().slice(0, 10),
        timestamp: Date.now().toString(),
        year: new Date().getFullYear().toString(),
        month: (new Date().getMonth() + 1).toString().padStart(2, '0'),
        day: new Date().getDate().toString().padStart(2, '0'),
        md5: generateMD5(imageData),
        md5_8: generateMD5(imageData, 8),
        md5_16: generateMD5(imageData, 16),
    };

    // 复用通用模板渲染函数
    return renderTemplateSimple(namingTemplate, variables);
}

/**
 * 生成完整的远程路径
 */
export async function generateNameAndRemotePath(
    localImageWithAbs: LocalImageMatchWithAbsPath,
    storageOptions: StorageOptions
): Promise<{
    name: string;
    remotePath: string;
    nameTemplateVariables: NameTemplateVariables;
}> {
    const fileInfo = await getFileInfo(localImageWithAbs.absLocalPath);

    try {
        const imageData = await readFile(localImageWithAbs.absLocalPath);
        
        // 生成模板变量
        const variables: NameTemplateVariables = {
            name: fileInfo.name,
            ext: fileInfo.ext,
            fileName: fileInfo.fileName,
            date: new Date().toISOString().slice(0, 10),
            timestamp: Date.now().toString(),
            year: new Date().getFullYear().toString(),
            month: (new Date().getMonth() + 1).toString().padStart(2, '0'),
            day: new Date().getDate().toString().padStart(2, '0'),
            md5: generateMD5(imageData),
            md5_8: generateMD5(imageData, 8),
            md5_16: generateMD5(imageData, 16),
        };
        
        const imageName = renderTemplateSimple(storageOptions.namingTemplate || '{fileName}', variables);

        // 构造最终路径
        const prefix = storageOptions.prefix || '';
        let normalizedPrefix = prefix;
        if (normalizedPrefix && !normalizedPrefix.endsWith('/')) {
            normalizedPrefix += '/';
        }
        return {
            name: imageName,
            remotePath: `${normalizedPrefix}${imageName}`,
            nameTemplateVariables: variables,
        };
    } catch (error) {
        throw new Error(`Failed to read file at ${localImageWithAbs.absLocalPath}: ${(error as Error).message}`);
    }
}
