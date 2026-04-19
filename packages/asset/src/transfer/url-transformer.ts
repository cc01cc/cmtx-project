/**
 * URL 转换器
 *
 * @module transfer/url-transformer
 * @description
 * 将源存储的 URL 转换为目标存储的 URL。
 *
 * @remarks
 * ## 命名策略
 *
 * ### 模板命名（推荐）
 * 使用 `namingTemplate` 字段，支持与 Upload 相同的模板变量：
 * - `{name}` - 文件名（不含扩展名）
 * - `{ext}` - 文件扩展名
 * - `{fileName}` - 完整文件名
 * - `{date}` - 日期（YYYY-MM-DD）
 * - `{timestamp}` - 时间戳
 * - `{year}/{month}/{day}` - 年月日分离
 * - `{md5}` - 完整 MD5 哈希（需要下载后计算）
 * - `{md5_8}` - MD5 前 8 位（需要下载后计算）
 * - `{md5_16}` - MD5 前 16 位（需要下载后计算）
 *
 * ### 旧策略（向后兼容）
 * - `preserve` - 保留原名
 * - `timestamp` - 时间戳
 * - `hash` - 基于 URL 的哈希
 * - `uuid` - UUID
 */

import { createHash } from 'node:crypto';
import * as path from 'node:path';
import { extractExtensionFromUrl, extractFileNameFromUrl } from '../utils/url-parser.js';
import type { UrlMapping } from './types.js';

/**
 * URL 转换器配置
 */
interface UrlTransformerConfig {
    customDomain?: string;
    prefix?: string;
    namingStrategy?: 'preserve' | 'timestamp' | 'hash' | 'uuid';
    namingTemplate?: string;
}

/**
 * 命名变量（用于模板渲染）
 */
export interface TransferNamingVariables {
    /** 文件名（不含扩展名） */
    name: string;

    /** 文件扩展名 */
    ext: string;

    /** 完整文件名 */
    fileName: string;

    /** 日期（YYYY-MM-DD） */
    date: string;

    /** 时间戳 */
    timestamp: string;

    /** 年 */
    year: string;

    /** 月 */
    month: string;

    /** 日 */
    day: string;

    /** 完整 MD5（需要下载后计算） */
    md5?: string;

    /** MD5 前 8 位（需要下载后计算） */
    md5_8?: string;

    /** MD5 前 16 位（需要下载后计算） */
    md5_16?: string;
}

/**
 * URL 转换器
 */
export class UrlTransformer {
    private readonly targetConfig: UrlTransformerConfig;

    constructor(targetConfig: UrlTransformerConfig) {
        this.targetConfig = targetConfig;
    }

    /**
     * 转换 URL（不依赖 MD5 的场景）
     *
     * @param originalUrl - 原始 URL
     * @param remotePath - 远程路径
     * @returns URL 映射
     */
    transform(originalUrl: string, _remotePath: string): UrlMapping {
        const fileName = this.generateFileName(originalUrl, null);
        const newRemotePath = this.buildRemotePath(fileName);
        const newUrl = this.buildUrl(newRemotePath);

        return {
            originalUrl,
            newUrl,
            remotePath: newRemotePath,
            size: 0,
            success: false,
        };
    }

    /**
     * 转换 URL（使用模板命名，支持 MD5）
     *
     * @param originalUrl - 原始 URL
     * @param localFilePath - 本地文件路径（用于计算 MD5）
     * @param fileContent - 文件内容（用于计算 MD5）
     * @returns URL 映射
     */
    transformWithContent(
        originalUrl: string,
        _localFilePath: string,
        fileContent?: Buffer
    ): UrlMapping {
        const fileName = this.generateFileNameWithTemplate(originalUrl, fileContent);
        const newRemotePath = this.buildRemotePath(fileName);
        const newUrl = this.buildUrl(newRemotePath);

        return {
            originalUrl,
            newUrl,
            remotePath: newRemotePath,
            size: fileContent?.length ?? 0,
            success: false,
        };
    }

    /**
     * 生成文件名
     */
    private generateFileName(originalUrl: string, _remotePath: string | null): string {
        // 如果使用模板命名
        if (this.targetConfig.namingTemplate) {
            return this.generateFileNameWithTemplate(originalUrl, undefined);
        }

        // 使用旧策略（向后兼容）
        return this.generateFileNameLegacy(originalUrl);
    }

    /**
     * 使用模板生成文件名
     */
    private generateFileNameWithTemplate(originalUrl: string, content?: Buffer): string {
        const template = this.targetConfig.namingTemplate || '{name}{ext}';
        const originalFileName = extractFileNameFromUrl(originalUrl);
        const extension = extractExtensionFromUrl(originalUrl);
        const lastDot = originalFileName.lastIndexOf('.');
        const name = lastDot > 0 ? originalFileName.slice(0, lastDot) : originalFileName;

        const now = new Date();
        const year = now.getFullYear().toString();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const date = `${year}-${month}-${day}`;
        const timestamp = now.getTime().toString();

        // 基础变量
        const variables: TransferNamingVariables = {
            name,
            ext: extension ? `.${extension}` : '',
            fileName: originalFileName,
            date,
            timestamp,
            year,
            month,
            day,
        };

        // 如果有内容，计算 MD5
        if (content) {
            const md5 = createHash('md5').update(content).digest('hex');
            variables.md5 = md5;
            variables.md5_8 = md5.slice(0, 8);
            variables.md5_16 = md5.slice(0, 16);
        } else if (template.includes('{md5')) {
            // 模板需要 MD5 但没有内容，使用占位符
            variables.md5 = '00000000000000000000000000000000';
            variables.md5_8 = '00000000';
            variables.md5_16 = '0000000000000000';
        }

        return this.renderTemplate(template, variables);
    }

    /**
     * 使用旧策略生成文件名（向后兼容）
     */
    private generateFileNameLegacy(originalUrl: string): string {
        const strategy = this.targetConfig.namingStrategy ?? 'preserve';
        const originalFileName = extractFileNameFromUrl(originalUrl);
        const extension = extractExtensionFromUrl(originalUrl);

        switch (strategy) {
            case 'preserve':
                return originalFileName;

            case 'timestamp': {
                const timestamp = Date.now();
                return `${timestamp}.${extension}`;
            }

            case 'hash': {
                const hash = this.hashString(originalUrl);
                return `${hash}.${extension}`;
            }

            case 'uuid': {
                const uuid = this.generateUUID();
                return `${uuid}.${extension}`;
            }

            default:
                return originalFileName;
        }
    }

    /**
     * 渲染模板
     */
    private renderTemplate(template: string, variables: TransferNamingVariables): string {
        let result = template;

        for (const [key, value] of Object.entries(variables)) {
            if (value !== undefined) {
                result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
            }
        }

        // 移除多余的分隔符
        result = result.replace(/\/+/g, '/');

        return result;
    }

    /**
     * 构建远程路径
     */
    private buildRemotePath(fileName: string): string {
        const prefix = this.targetConfig.prefix ?? '';
        return path.posix.join(prefix, fileName).replace(/^\//, '');
    }

    /**
     * 构建完整 URL
     */
    private buildUrl(remotePath: string): string {
        const customDomain = this.targetConfig.customDomain;

        if (customDomain) {
            const baseUrl = customDomain.endsWith('/') ? customDomain.slice(0, -1) : customDomain;
            // 自动添加 https:// 前缀
            const url = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
            return `${url}/${remotePath}`;
        }

        return remotePath;
    }

    /**
     * 计算字符串哈希
     */
    private hashString(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36).substring(0, 10);
    }

    /**
     * 生成 UUID
     */
    private generateUUID(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }

    /**
     * 检查模板是否需要 MD5
     */
    needsMd5(): boolean {
        const template = this.targetConfig.namingTemplate || '';
        return (
            template.includes('{md5}') ||
            template.includes('{md5_8}') ||
            template.includes('{md5_16}')
        );
    }
}

/**
 * 创建 URL 转换器
 */
export function createUrlTransformer(targetConfig: UrlTransformerConfig): UrlTransformer {
    return new UrlTransformer(targetConfig);
}
