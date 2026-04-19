import { resolve } from 'node:path';
import type { DownloadOptions, DownloadProgress } from '@cmtx/asset/download';
import { createDownloadService } from '@cmtx/asset/download';
import type { Argv, CommandModule } from 'yargs';
import { formatError, formatInfo, formatSuccess, formatWarning } from '../utils/formatter.js';
import { createLogger } from '../utils/logger.js';

export const command = 'download <input>';
export const describe = '下载 Markdown 中的远程图片到本地';

interface DownloadCommandOptions {
    input: string;
    output: string;
    domain?: string;
    naming?: string;
    concurrency?: number;
    overwrite?: boolean;
    'dry-run'?: boolean;
    verbose?: boolean;
}

export function builder(yargs: Argv): Argv {
    return yargs
        .positional('input', {
            description: 'Markdown 文件路径或 URL',
            type: 'string',
            demandOption: true,
        })
        .option('output', {
            alias: 'o',
            description: '输出目录（必填）',
            type: 'string',
            demandOption: true,
        })
        .option('domain', {
            alias: 'd',
            description: '只下载指定域名的图片',
            type: 'string',
        })
        .option('naming', {
            alias: 'n',
            description:
                '文件命名模板，支持变量：{original}, {hash}, {timestamp}, {date}, {sequence}',
            type: 'string',
            default: '{original}{ext}',
        })
        .option('concurrency', {
            alias: 'c',
            description: '并发数',
            type: 'number',
            default: 5,
        })
        .option('overwrite', {
            description: '覆盖已存在的文件',
            type: 'boolean',
            default: false,
        })
        .option('dry-run', {
            description: '预览模式，不实际下载',
            type: 'boolean',
            default: false,
        })
        .option('verbose', {
            alias: 'v',
            description: '显示详细信息',
            type: 'boolean',
            default: false,
        });
}

export async function handler(argv: DownloadCommandOptions): Promise<void> {
    const log = createLogger(argv.verbose);

    log('debug', `开始下载: ${argv.input}`);
    log('debug', `输出目录: ${argv.output}`);
    log('debug', `命名模板: ${argv.naming}`);
    log('debug', `并发数: ${argv.concurrency}`);

    const inputPath = resolve(argv.input);
    const outputDir = resolve(argv.output);

    // 进度回调
    const onProgress = (progress: DownloadProgress) => {
        if (argv.verbose) {
            const status =
                progress.status === 'completed'
                    ? formatSuccess('完成')
                    : progress.status === 'failed'
                      ? formatError('失败')
                      : progress.status === 'skipped'
                        ? formatWarning('跳过')
                        : '下载中';
            log(
                'info',
                `  [${progress.current}/${progress.total}] ${progress.fileName}: ${status}`
            );
        }
    };

    // 创建下载选项
    const options: DownloadOptions = {
        outputDir,
        namingTemplate: argv.naming,
        domain: argv.domain,
        concurrency: argv.concurrency,
        overwrite: argv.overwrite,
        onProgress,
        debug: argv.verbose,
    };

    // 预览模式
    if (argv['dry-run']) {
        log('info', formatInfo('预览模式：不实际下载文件'));
        log('info', `将从 ${inputPath} 下载图片到 ${outputDir}`);
        return;
    }

    try {
        // 创建下载服务
        const service = createDownloadService({ options });

        // 执行下载
        const result = await service.downloadFromMarkdown(inputPath);

        // 输出结果
        console.log('');
        console.log(formatInfo('下载完成:'));
        console.log(`  总数: ${result.total}`);
        console.log(`  ${formatSuccess('成功')}: ${result.success}`);
        if (result.skipped > 0) {
            console.log(`  ${formatWarning('跳过')}: ${result.skipped}`);
        }
        if (result.failed > 0) {
            console.log(`  ${formatError('失败')}: ${result.failed}`);
        }

        // 显示下载的文件
        if (argv.verbose && result.items.length > 0) {
            console.log('');
            console.log(formatInfo('下载的文件:'));
            for (const item of result.items) {
                if (item.success && !item.skipped) {
                    console.log(`  ${formatSuccess('✓')} ${item.fileName} (${item.size} bytes)`);
                }
            }
        }

        // 显示错误
        if (result.errors.length > 0) {
            console.log('');
            console.log(formatError('错误详情:'));
            for (const error of result.errors) {
                console.log(`  ${error.url}: ${error.error}`);
            }
        }

        // 返回退出码
        process.exit(result.failed > 0 ? 1 : 0);
    } catch (error) {
        console.error(
            formatError(`下载失败: ${error instanceof Error ? error.message : String(error)}`)
        );
        process.exit(1);
    }
}

const downloadModule: CommandModule = {
    command,
    describe,
    builder,
    handler: (args) => handler(args as unknown as DownloadCommandOptions),
};

export default downloadModule;
