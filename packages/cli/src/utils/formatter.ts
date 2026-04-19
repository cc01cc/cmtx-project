/**
 * 输出格式化
 *
 * 支持 JSON、表格、纯文本格式
 */

import chalk from 'chalk';
import type { OutputFormat } from '../types/cli.js';

// 定义分析结果类型
interface AnalysisResult {
    images: Array<{
        localPath: string;
        fileSize: number;
        referencedIn: string[];
    }>;
    skipped: Array<{
        localPath: string;
        reason: string;
    }>;
    totalSize: number;
    totalCount: number;
}

/**
 * 格式化分析结果
 */
export function formatAnalyzeResult(
    analysis: AnalysisResult,
    format: OutputFormat = 'table'
): string {
    switch (format) {
        case 'json':
            return formatAnalyzeJSON(analysis);
        case 'table':
            return formatAnalyzeTable(analysis);
        case 'plain':
            return formatAnalyzePlain(analysis);
    }
}

/**
 * JSON 格式输出
 */
function formatAnalyzeJSON(analysis: AnalysisResult): string {
    return JSON.stringify(
        {
            success: true,
            timestamp: new Date().toISOString(),
            result: {
                summary: {
                    total: analysis.images.length,
                    skipped: analysis.skipped.length,
                    totalSize: analysis.totalSize,
                    totalReferences: analysis.images.reduce(
                        (sum, img) => sum + img.referencedIn.length,
                        0
                    ),
                },
                images: analysis.images,
                skipped: analysis.skipped,
            },
        },
        null,
        2
    );
}

/**
 * 表格格式输出
 */
function formatAnalyzeTable(analysis: AnalysisResult): string {
    let output = chalk.bold('\n✓ 分析结果\n');

    if (analysis.images.length > 0) {
        output += chalk.cyan('📸 有效图片：\n');
        for (const img of analysis.images) {
            const sizeKB = (img.fileSize / 1024).toFixed(1);
            output += chalk.dim(
                `  • ${img.localPath} (${sizeKB}KB, ${img.referencedIn.length} 处引用)\n`
            );
        }
    }

    if (analysis.skipped.length > 0) {
        output += chalk.yellow('\n⚠️  跳过的图片：\n');
        for (const skipped of analysis.skipped) {
            output += chalk.dim(`  • ${skipped.localPath} (${skipped.reason})\n`);
        }
    }

    const totalSize = (analysis.totalSize / 1024).toFixed(1);
    output += chalk.bold('\n📊 统计：\n');
    output += chalk.dim(
        `  总图片数: ${analysis.images.length}\n` +
            `  跳过数: ${analysis.skipped.length}\n` +
            `  总大小: ${totalSize}KB\n` +
            `  总引用数: ${analysis.images.reduce((sum, img) => sum + img.referencedIn.length, 0)}\n`
    );

    return output;
}

/**
 * 纯文本格式输出（日志风格）
 */
function formatAnalyzePlain(analysis: AnalysisResult): string {
    const lines: string[] = [
        `[分析完成] 有效图片: ${analysis.images.length}, 跳过: ${analysis.skipped.length}`,
        `[大小统计] ${(analysis.totalSize / 1024).toFixed(1)}KB`,
    ];

    for (const img of analysis.images) {
        lines.push(`  ✓ ${img.localPath}`);
    }

    for (const skipped of analysis.skipped) {
        lines.push(`  ✗ ${skipped.localPath} (${skipped.reason})`);
    }

    return lines.join('\n');
}

/**
 * 格式化上传预览结果（dry-run）
 */
export function formatUploadPreview(
    preview: { imagePath: string; remotePath: string }[],
    willReplace: number,
    willDelete: number,
    format: OutputFormat = 'table'
): string {
    switch (format) {
        case 'json':
            return JSON.stringify(
                {
                    success: true,
                    dryRun: true,
                    timestamp: new Date().toISOString(),
                    preview: {
                        uploads: preview,
                        willReplaceInFiles: willReplace,
                        willDeleteFiles: willDelete,
                    },
                },
                null,
                2
            );
        case 'table':
            return formatPreviewTable(preview, willReplace, willDelete);
        case 'plain':
            return formatPreviewPlain(preview, willReplace, willDelete);
    }
}

/**
 * 上传预览表格格式
 */
function formatPreviewTable(
    preview: { imagePath: string; remotePath: string }[],
    willReplace: number,
    willDelete: number
): string {
    let output = chalk.bold('\n📋 上传预览（干运行）\n');

    output += chalk.cyan('📤 待上传文件：\n');
    for (const item of preview) {
        output += chalk.dim(`  • ${item.imagePath} → ${item.remotePath}\n`);
    }

    output += chalk.bold('\n📊 预期操作：\n');
    output += chalk.dim(`  将在 ${willReplace} 个文件中替换引用\n`);
    output += chalk.dim(`  将删除 ${willDelete} 个本地文件\n`);
    output += chalk.yellow('\n⚠️  这是预览，未实际执行任何操作\n');

    return output;
}

/**
 * 上传预览纯文本格式
 */
function formatPreviewPlain(
    preview: { imagePath: string; remotePath: string }[],
    willReplace: number,
    willDelete: number
): string {
    const lines: string[] = [
        '[DRY-RUN] 上传预览',
        `[待上传] ${preview.length} 个文件`,
        `[替换] ${willReplace} 个文件中的引用`,
        `[删除] ${willDelete} 个本地文件`,
    ];

    for (const item of preview) {
        lines.push(`  • ${item.imagePath} → ${item.remotePath}`);
    }

    return lines.join('\n');
}

/**
 * 格式化错误消息
 */
export function formatError(error: Error | string): string {
    const message = typeof error === 'string' ? error : error.message;
    return chalk.red(`✗ 错误: ${message}`);
}

/**
 * 格式化成功消息
 */
export function formatSuccess(message: string): string {
    return chalk.green(`✓ ${message}`);
}

/**
 * 格式化警告消息
 */
export function formatWarning(message: string): string {
    return chalk.yellow(`⚠️  ${message}`);
}

/**
 * 格式化信息消息
 */
export function formatInfo(message: string): string {
    return chalk.blue(`ℹ ${message}`);
}
