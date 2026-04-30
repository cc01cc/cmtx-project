/**
 * AutoCorrect Rule
 *
 * @module autocorrect-rule
 * @description
 * 基于 AutoCorrect 的 CJK 文案自动纠正 Rule。
 * 自动处理中英文混排空格、标点符号纠正、拼写检查等。
 *
 * @see <https://github.com/huacnlee/autocorrect>
 */

import type { Rule, RuleContext, RuleResult } from "../rule-types.js";
import { loadWASM, formatFor, loadConfig, isWasmLoaded } from "@cmtx/autocorrect-wasm";

/**
 * AutoCorrect Rule 配置
 */
export interface AutocorrectConfig {
    /** 配置文件路径 (.autocorrectrc) */
    configPath?: string;

    /** 是否启用严格模式 */
    strict?: boolean;
}

/**
 * AutoCorrect 文案纠正 Rule
 *
 * @example
 * ```typescript
 * const result = await autocorrectRule.execute({
 *   document: 'Hello你好世界.',
 *   filePath: '/test.md'
 * }, { strict: true });
 * // result.content: 'Hello 你好世界。'
 * ```
 */
export const autocorrectRule: Rule = {
    id: "autocorrect",
    name: "AutoCorrect 文案纠正",
    description: "自动纠正 CJK 文案中的空格、标点符号和拼写",

    async execute(context: RuleContext, config?: AutocorrectConfig): Promise<RuleResult> {
        const { document, filePath } = context;

        try {
            // 确保 WASM 已加载
            if (!isWasmLoaded()) {
                await loadWASM();
            }

            // 如果提供了配置路径，加载配置
            if (config?.configPath) {
                try {
                    const { readFile } = await import("node:fs/promises");
                    const configContent = await readFile(config.configPath, "utf-8");
                    loadConfig(configContent);
                } catch {
                    // 配置文件不存在或读取失败，使用默认配置
                }
            }

            // 根据文件路径推断文件类型
            const fileType = inferFileType(filePath);

            // 执行格式化
            const formatted = formatFor(document, fileType);

            const modified = formatted !== document;

            return {
                content: formatted,
                modified,
                messages: modified ? [`已应用 AutoCorrect 纠正 (${fileType} 格式)`] : ["无需纠正"],
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return {
                content: document,
                modified: false,
                messages: [`AutoCorrect 执行失败: ${message}`],
            };
        }
    },
};

/**
 * 从文件路径推断文件类型
 */
function inferFileType(filePath: string): string {
    const ext = filePath.toLowerCase().split(".").pop();

    const typeMap: Record<string, string> = {
        md: "markdown",
        markdown: "markdown",
        txt: "text",
        html: "html",
        htm: "html",
        xml: "xml",
        json: "json",
        yaml: "yaml",
        yml: "yaml",
        js: "javascript",
        ts: "typescript",
        jsx: "jsx",
        tsx: "tsx",
        css: "css",
        scss: "scss",
        less: "less",
        py: "python",
        rb: "ruby",
        java: "java",
        go: "go",
        rs: "rust",
        c: "c",
        cpp: "cpp",
        h: "c",
        hpp: "cpp",
        sh: "shell",
        bash: "shell",
        zsh: "shell",
        sql: "sql",
    };

    return typeMap[ext || ""] || "text";
}
