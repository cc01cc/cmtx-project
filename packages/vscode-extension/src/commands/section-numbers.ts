/**
 * 章节编号命令模块
 *
 * @module section-numbers
 * @description
 * 提供 VS Code 命令实现，用于添加、更新和移除 Markdown 文档的章节编号。
 *
 * @remarks
 * ## 参考
 *
 * 本模块的实现参考了 Markdown All in One 扩展的设计：
 * - 仓库：https://github.com/yzhang-gh/vscode-markdown
 * - 版本：v3.6.3
 * - License: MIT License
 */

export {
    addSectionNumbersRuleCommand as addSectionNumbersCommand,
    removeSectionNumbersRuleCommand as removeSectionNumbersCommand,
} from "./rules/index.js";
