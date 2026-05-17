/**
 * section-numbers 命令组 - 章节编号管理命令集合
 *
 * 用法：cmtx section-numbers <command> [options]
 */

import type { Argv, CommandModule } from "yargs";

import addCmd from "./section-numbers/add.js";
import removeCmd from "./section-numbers/remove.js";

export const command = "section-numbers <command>";
export const description = "章节编号管理（添加/移除）";

export function builder(yargs: Argv): Argv {
    return yargs
        .command(addCmd)
        .command(removeCmd)
        .demandCommand(
            1,
            "请提供 section-numbers 子命令，运行 cmtx section-numbers --help 查看帮助",
        )
        .strictCommands();
}

export function handler(): void {
    // 空 handler，子命令消费
}

const sectionNumbersModule: CommandModule = {
    command,
    describe: description,
    builder,
    handler: () => handler(),
};

export default sectionNumbersModule;
