/**
 * 主 CLI 程序
 */

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

// 命令模块
import analyzeCmd from "./commands/analyze.js";
import uploadCmd from "./commands/upload.js";
import configCmd from "./commands/config.js";

export const cli = yargs(hideBin(process.argv))
  .scriptName("cmtx")
  .usage("$0 <command> [options]")
  .command(analyzeCmd)
  .command(uploadCmd)
  .command(configCmd)
  .recommendCommands()
  .strict()
  .help()
  .alias("h", "help");
