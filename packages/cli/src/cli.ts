/**
 * 主 CLI 程序
 */

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

// 命令模块
import configCmd from "./commands/config.js";
import formatCmd from "./commands/format.js";
import imageCmd from "./commands/image.js";
import publishCmd from "./commands/publish.js";

export const cli = yargs(hideBin(process.argv))
    .scriptName("cmtx")
    .usage("$0 <command> [options]")
    .command(configCmd)
    .command(formatCmd)
    .command(imageCmd)
    .command(publishCmd)
    .demandCommand(1, "请提供一个命令，运行 cmtx --help 查看帮助")
    .strictCommands()
    .recommendCommands()
    .help()
    .alias("h", "help");
