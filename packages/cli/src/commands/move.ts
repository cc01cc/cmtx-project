/**
 * move 命令 - 移动 Markdown 中的远程图片到目标存储
 *
 * 用法：cmtx move <filePath> [options]
 * 示例：cmtx move ./article.md --config move-config.yaml
 *
 * 与 copy 的区别：
 * - copy: 复制图片，源文件保留
 * - move: 移动图片，源文件删除
 */

import type { Argv, CommandModule } from 'yargs';
import type { MoveCommandOptions } from '../types/cli.js';
import { formatError } from '../utils/formatter.js';
import { createLogger } from '../utils/logger.js';

// 复用 copy 命令的核心逻辑
import { builder as copyBuilder, handler as copyHandler } from './copy.js';

export const command = 'move <filePath>';
export const description = '移动 Markdown 文件中的远程图片到目标存储（源文件删除）';

export function builder(yargs: Argv): Argv {
    // 继承 copy 命令的所有选项
    let result = copyBuilder(yargs);

    // 添加 move 特有的选项
    result = result
        .option('keep-source', {
            description: '保留源文件（等同于 copy）',
            type: 'boolean',
            default: false,
        })
        .option('delete-source', {
            description: '删除源文件（默认 true，move 命令的默认行为）',
            type: 'boolean',
            default: true,
        });

    return result;
}

export async function handler(argv: MoveCommandOptions): Promise<void> {
    const logger = createLogger(argv.verbose, argv.quiet);

    // move 的默认行为是删除源文件
    // 除非用户明确指定 --keep-source
    const deleteSource = argv.keepSource ? false : argv.deleteSource;

    if (!deleteSource) {
        logger('info', '注意：--keep-source 已设置，源文件将保留（等同于 copy）');
    }

    try {
        // 调用 copy 命令，但设置 deleteSource 选项
        await copyHandler({
            ...argv,
            // move 命令会将 deleteSource 传递给配置
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(formatError(message));
        process.exit(1);
    }
}

// 默认导出为 yargs CommandModule
const moveModule: CommandModule = {
    command,
    describe: description,
    builder,
    handler: (args) => handler(args as unknown as MoveCommandOptions),
};

export default moveModule;
