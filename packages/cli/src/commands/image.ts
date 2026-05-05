/**
 * image 命令组 - 图片管理命令集合
 *
 * 用法：cmtx image <command> [options]
 */

import type { Argv, CommandModule } from "yargs";

import analyzeCmd from "./image/analyze.js";
import copyCmd from "./image/copy.js";
import deleteCmd from "./image/delete.js";
import downloadCmd from "./image/download.js";
import moveCmd from "./image/move.js";
import presignCmd from "./image/presign.js";
import pruneCmd from "./image/prune.js";
import uploadCmd from "./image/upload.js";

export const command = "image <command>";
export const description = "图片管理命令";

export function builder(yargs: Argv): Argv {
    return yargs
        .command(analyzeCmd)
        .command(copyCmd)
        .command(deleteCmd)
        .command(downloadCmd)
        .command(moveCmd)
        .command(presignCmd)
        .command(pruneCmd)
        .command(uploadCmd)
        .demandCommand(1, "请提供 image 子命令，运行 cmtx image --help 查看帮助")
        .strictCommands();
}

export function handler(): void {
    // 空 handler，子命令消费
}

const imageModule: CommandModule = {
    command,
    describe: description,
    builder,
    handler: () => handler(),
};

export default imageModule;
