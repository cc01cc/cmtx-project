/**
 * 主 CLI 程序
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

// 命令模块
import adaptCmd from './commands/adapt.js';
import analyzeCmd from './commands/analyze.js';
import configCmd from './commands/config.js';
import copyCmd from './commands/copy.js';
import downloadCmd from './commands/download.js';
import formatCmd from './commands/format.js';
import moveCmd from './commands/move.js';
import presignCmd from './commands/presign.js';
import uploadCmd from './commands/upload.js';

export const cli = yargs(hideBin(process.argv))
    .scriptName('cmtx')
    .usage('$0 <command> [options]')
    .command(analyzeCmd)
    .command(copyCmd)
    .command(downloadCmd)
    .command(moveCmd)
    .command(presignCmd)
    .command(uploadCmd)
    .command(configCmd)
    .command(formatCmd)
    .command(adaptCmd)
    .recommendCommands()
    .strict()
    .help()
    .alias('h', 'help');
