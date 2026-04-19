/**
 * format 命令 - 转换 Markdown 文件中的图片格式
 *
 * 用法：cmtx format <filePath> --to <format> [options]
 * 示例：cmtx format ./docs/article.md --to html --output ./docs/article-html.md
 */

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { ParsedImage } from '@cmtx/core';
import {
    formatHtmlImage,
    formatMarkdownImage,
    parseImages,
    updateImageAttribute,
} from '@cmtx/core';
import type { Argv, CommandModule } from 'yargs';
import type { FormatCommandOptions } from '../types/cli.js';
import { formatError, formatInfo, formatSuccess } from '../utils/formatter.js';
import { createLogger } from '../utils/logger.js';

export const command = 'format <filePath>';
export const description = '转换 Markdown 文件中的图片格式（Markdown <=> HTML）';

interface ConversionStats {
    convertedCount: number;
    mdToHtmlCount: number;
    htmlToMdCount: number;
    resizedCount: number;
}

interface TransformOptions {
    targetFormat: 'markdown' | 'html';
    width?: string;
    height?: string;
    verbose: boolean;
    log: (level: 'debug' | 'info' | 'warn' | 'error', message: string) => void;
}

export function builder(yargs: Argv): Argv {
    return yargs
        .positional('filePath', {
            description: 'Markdown 文件路径',
            type: 'string',
        })
        .option('to', {
            alias: 't',
            description: '目标格式',
            choices: ['markdown', 'html'],
            demandOption: true,
            type: 'string',
        })
        .option('output', {
            alias: 'o',
            description: '输出文件路径（默认覆盖原文件）',
            type: 'string',
        })
        .option('width', {
            description: '仅对 HTML 图片生效，设置 width 属性（如 400 或 50%）',
            type: 'string',
        })
        .option('height', {
            description: '仅对 HTML 图片生效，设置 height 属性（如 240 或 auto）',
            type: 'string',
        })
        .option('in-place', {
            alias: 'i',
            description: '原地修改文件',
            type: 'boolean',
            default: false,
        })
        .option('dry-run', {
            alias: 'd',
            description: '预览转换结果，不实际修改文件',
            type: 'boolean',
            default: false,
        })
        .option('verbose', {
            alias: 'v',
            description: '显示详细转换信息',
            type: 'boolean',
            default: false,
        });
}

function applyHtmlSize(image: string, width?: string, height?: string): string {
    let nextImage = image;
    if (width) {
        nextImage = updateImageAttribute(nextImage, 'width', width);
    }
    if (height) {
        nextImage = updateImageAttribute(nextImage, 'height', height);
    }
    return nextImage;
}

function resolveOutputPath(filePath: string, output?: string): string {
    return output ? resolve(output) : filePath;
}

function transformImages(
    content: string,
    imagesToConvert: ParsedImage[],
    htmlImagesToResize: ParsedImage[],
    options: TransformOptions
): { newContent: string; stats: ConversionStats } {
    let newContent = content;
    const { targetFormat, width, height, verbose, log } = options;
    const stats: ConversionStats = {
        convertedCount: imagesToConvert.length,
        mdToHtmlCount: 0,
        htmlToMdCount: 0,
        resizedCount: 0,
    };

    for (const img of imagesToConvert) {
        const newImage =
            targetFormat === 'html'
                ? formatHtmlImage({
                      src: img.src,
                      alt: img.alt || '',
                      attributes: {
                          width,
                          height,
                      },
                  })
                : formatMarkdownImage({ src: img.src, alt: img.alt || '' });

        newContent = newContent.replace(img.raw, newImage);

        if (targetFormat === 'html') {
            stats.mdToHtmlCount++;
        } else {
            stats.htmlToMdCount++;
        }

        if (verbose) {
            log('debug', `转换: ${img.raw} -> ${newImage}`);
        }
    }

    for (const img of htmlImagesToResize) {
        const newImage = applyHtmlSize(img.raw, width, height);
        if (newImage === img.raw) {
            continue;
        }

        newContent = newContent.replace(img.raw, newImage);
        stats.resizedCount++;

        if (verbose) {
            log('debug', `更新尺寸: ${img.raw} -> ${newImage}`);
        }
    }

    return { newContent, stats };
}

function printDryRunSummary(
    filePath: string,
    targetFormat: 'markdown' | 'html',
    stats: ConversionStats,
    width: string | undefined,
    height: string | undefined,
    imagesToConvert: ParsedImage[],
    verbose: boolean
): void {
    console.log(`\n${formatInfo('转换预览（干运行）')}`);
    console.log('----------------------------------------');
    console.log(`文件: ${filePath}`);
    console.log(`目标格式: ${targetFormat}`);
    console.log(`转换图片数: ${stats.convertedCount}`);
    if (stats.mdToHtmlCount > 0) {
        console.log(`Markdown -> HTML: ${stats.mdToHtmlCount}`);
    }
    if (stats.htmlToMdCount > 0) {
        console.log(`HTML -> Markdown: ${stats.htmlToMdCount}`);
    }
    if (stats.resizedCount > 0) {
        console.log(`HTML 尺寸更新: ${stats.resizedCount}`);
    }
    if (targetFormat === 'html' && (width || height)) {
        console.log(`目标尺寸: width=${width || '-'}, height=${height || '-'}`);
    }
    console.log('----------------------------------------');

    if (verbose) {
        console.log('\n转换详情:');
        for (const img of imagesToConvert) {
            const newImage =
                targetFormat === 'html'
                    ? formatHtmlImage({
                          src: img.src,
                          alt: img.alt || '',
                          attributes: {
                              width,
                              height,
                          },
                      })
                    : formatMarkdownImage({ src: img.src, alt: img.alt || '' });
            console.log(`\n原始: ${img.raw}`);
            console.log(`转换: ${newImage}`);
        }
    }

    console.log(`\n${formatInfo('这是预览，未实际修改文件')}`);
}

function printSuccessSummary(
    outputPath: string,
    targetFormat: 'markdown' | 'html',
    stats: ConversionStats,
    width: string | undefined,
    height: string | undefined
): void {
    console.log(`\n${formatSuccess('转换完成！')}`);
    console.log(`  转换图片: ${stats.convertedCount}`);
    if (stats.mdToHtmlCount > 0) {
        console.log(`  Markdown -> HTML: ${stats.mdToHtmlCount}`);
    }
    if (stats.htmlToMdCount > 0) {
        console.log(`  HTML -> Markdown: ${stats.htmlToMdCount}`);
    }
    if (stats.resizedCount > 0) {
        console.log(`  HTML 尺寸更新: ${stats.resizedCount}`);
    }
    if (targetFormat === 'html' && (width || height)) {
        console.log(`  目标尺寸: width=${width || '-'}, height=${height || '-'}`);
    }
    console.log(`  输出文件: ${outputPath}`);
}

export async function handler(argv: FormatCommandOptions): Promise<void> {
    const logger = createLogger(argv.verbose, false);

    try {
        // 验证参数
        if (argv.output && argv.inPlace) {
            console.error(formatError('--output 和 --in-place 参数不能同时使用'));
            process.exit(1);
        }

        const targetFormat = argv.to;
        const filePath = resolve(argv.filePath);
        const width = argv.width;
        const height = argv.height;

        logger('info', `读取文件: ${filePath}`);

        // 读取文件内容
        const content = await readFile(filePath, 'utf-8');

        // 解析所有图片
        const images = parseImages(content);

        if (images.length === 0) {
            logger('info', '文件中未找到图片，无需转换');
            console.log(formatInfo('文件中未找到图片'));
            return;
        }

        logger('info', `找到 ${images.length} 个图片`);

        // 根据目标格式筛选需要转换的图片
        const sourceFormat = targetFormat === 'markdown' ? 'html' : 'md';
        const imagesToConvert = images.filter((img) => img.syntax === sourceFormat);
        const hasResizeRequest = targetFormat === 'html' && (width || height);

        const htmlImagesToResize = hasResizeRequest
            ? images.filter((img) => img.syntax === 'html')
            : [];

        if (imagesToConvert.length === 0 && htmlImagesToResize.length === 0) {
            logger('info', `所有图片已经是 ${targetFormat} 格式，无需转换`);
            console.log(formatInfo(`所有图片已经是 ${targetFormat} 格式`));
            return;
        }

        logger('info', `需要转换 ${imagesToConvert.length} 个图片`);
        if (htmlImagesToResize.length > 0) {
            logger('info', `需要更新尺寸 ${htmlImagesToResize.length} 个 HTML 图片`);
        }

        const { newContent, stats } = transformImages(
            content,
            imagesToConvert,
            htmlImagesToResize,
            {
                targetFormat,
                width,
                height,
                verbose: Boolean(argv.verbose),
                log: logger,
            }
        );

        if (targetFormat === 'markdown' && (width || height)) {
            logger('info', 'width/height 参数仅对 HTML 输出生效，已忽略');
        }

        // 确定输出路径
        const outputPath = resolveOutputPath(filePath, argv.output);

        // 如果是 dry-run，只显示预览
        if (argv.dryRun) {
            printDryRunSummary(
                filePath,
                targetFormat,
                stats,
                width,
                height,
                imagesToConvert,
                Boolean(argv.verbose)
            );
            return;
        }

        // 写入文件
        await writeFile(outputPath, newContent, 'utf-8');

        // 输出结果
        printSuccessSummary(outputPath, targetFormat, stats, width, height);

        logger('info', `文件已保存: ${outputPath}`);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(formatError(message));
        process.exit(1);
    }
}

// 默认导出为 yargs CommandModule
const formatModule: CommandModule = {
    command,
    describe: description,
    builder,
    handler: (args) => handler(args as unknown as FormatCommandOptions),
};

export default formatModule;
