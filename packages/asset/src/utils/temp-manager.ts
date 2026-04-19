/**
 * 临时文件管理器
 *
 * @module utils/temp-manager
 * @description
 * 管理传输过程中的临时文件，包括创建、清理和磁盘空间检查。
 *
 * @remarks
 * ## 关键设计
 * - 每个传输任务拥有独立的临时目录
 * - 使用 try-finally 确保临时文件清理
 * - 支持磁盘空间预检查
 * - 自动清理空目录
 */

import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

/**
 * 临时文件管理器
 */
export class TempManager {
    private readonly baseDir: string;
    private taskDirs: Set<string> = new Set();

    /**
     * 创建临时文件管理器
     * @param baseDir - 基础临时目录（默认为系统临时目录）
     */
    constructor(baseDir?: string) {
        this.baseDir = baseDir || path.join(os.tmpdir(), 'cmtx-asset-transfer');
    }

    /**
     * 创建任务临时目录
     * @returns 临时目录路径
     */
    async createTaskDir(): Promise<string> {
        const taskId = this.generateTaskId();
        const taskDir = path.join(this.baseDir, taskId);

        await fs.mkdir(taskDir, { recursive: true });
        this.taskDirs.add(taskDir);

        return taskDir;
    }

    /**
     * 获取临时文件路径
     * @param taskDir - 任务临时目录
     * @param fileName - 文件名（可以是带路径的）
     * @returns 完整的临时文件路径
     */
    getTempFilePath(taskDir: string, fileName: string): string {
        // 将路径中的分隔符替换为下划线，保留完整路径信息避免冲突
        // 例如: blog/2026-03/image.png → blog_2026-03_image.png
        const safeFileName = fileName
            .replace(/[/\\]/g, '_') // 路径分隔符转为下划线
            .replace(/[^a-zA-Z0-9._-]/g, '_'); // 其他非安全字符
        return path.join(taskDir, safeFileName);
    }

    /**
     * 生成安全的临时文件名
     * @param originalUrl - 原始 URL
     * @param extension - 文件扩展名
     * @returns 安全的临时文件名
     */
    generateTempFileName(originalUrl: string, extension?: string): string {
        const hash = this.hashString(originalUrl);
        const ext = extension || this.extractExtension(originalUrl);
        return `${hash}${ext}`;
    }

    /**
     * 清理临时目录
     * @param taskDir - 任务临时目录
     */
    async cleanup(taskDir: string): Promise<void> {
        try {
            // 检查目录是否存在
            await fs.access(taskDir);

            // 读取目录内容
            const entries = await fs.readdir(taskDir, { withFileTypes: true });

            // 删除所有文件和子目录
            for (const entry of entries) {
                const fullPath = path.join(taskDir, entry.name);
                if (entry.isDirectory()) {
                    await this.cleanup(fullPath);
                    await fs.rmdir(fullPath);
                } else {
                    await fs.unlink(fullPath);
                }
            }

            // 删除空目录
            await fs.rmdir(taskDir);
            this.taskDirs.delete(taskDir);
        } catch (error) {
            // 目录可能不存在，忽略错误
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
                throw error;
            }
        }
    }

    /**
     * 清理所有任务临时目录
     */
    async cleanupAll(): Promise<void> {
        const dirs = Array.from(this.taskDirs);
        for (const dir of dirs) {
            await this.cleanup(dir);
        }
    }

    /**
     * 检查磁盘空间
     * @param requiredBytes - 需要的字节数
     * @returns 是否有足够的磁盘空间
     */
    async checkDiskSpace(requiredBytes: number): Promise<boolean> {
        try {
            // 确保基础目录存在
            await fs.mkdir(this.baseDir, { recursive: true });

            // 使用唯一文件名避免并发冲突
            const testFile = path.join(
                this.baseDir,
                `.space-check-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
            );
            const testBuffer = Buffer.alloc(Math.min(requiredBytes, 1024 * 1024)); // 最多 1MB 测试

            try {
                await fs.writeFile(testFile, testBuffer);
                await fs.unlink(testFile);
                return true;
            } catch (_error) {
                return false;
            }
        } catch {
            return false;
        }
    }

    /**
     * 获取临时目录的可用空间（近似值）
     * @returns 可用字节数（-1 表示无法确定）
     */
    async getAvailableSpace(): Promise<number> {
        // 简化实现，实际应该使用系统调用
        // 返回 -1 表示无法确定
        return -1;
    }

    /**
     * 生成任务 ID
     * @returns 唯一的任务 ID
     */
    private generateTaskId(): string {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `${timestamp}-${random}`;
    }

    /**
     * 计算字符串哈希
     * @param str - 输入字符串
     * @returns 哈希值
     */
    private hashString(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // 转换为 32bit 整数
        }
        return Math.abs(hash).toString(36).substring(0, 10);
    }

    /**
     * 从 URL 提取扩展名
     * @param url - URL
     * @returns 扩展名（包含点号）
     */
    private extractExtension(url: string): string {
        try {
            const pathname = new URL(url).pathname;
            const ext = path.extname(pathname);
            return ext || '.tmp';
        } catch {
            // URL 解析失败，尝试从字符串提取
            const match = url.match(/\.[a-zA-Z0-9]+(?:[?#]|$)/);
            return match ? match[0].replace(/[?#]$/, '') : '.tmp';
        }
    }
}

/**
 * 创建临时文件管理器实例
 * @param baseDir - 基础临时目录
 * @returns TempManager 实例
 */
export function createTempManager(baseDir?: string): TempManager {
    return new TempManager(baseDir);
}
