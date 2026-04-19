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

import type { Rule, RuleContext, RuleResult } from '../rule-types.js';

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
 * Lint 结果中的单行错误信息
 */
interface LintLine {
    /** 行号 */
    l: number;
    /** 列号 */
    c: number;
    /** 纠正后的文本 */
    new: string;
    /** 原始文本 */
    old: string;
    /** 严重程度: 1=错误, 2=警告 */
    severity: number;
}

/**
 * Lint 结果
 */
interface LintResult {
    /** 文件路径 */
    filepath: string;
    /** 错误行列表 */
    lines: LintLine[];
    /** 错误信息 */
    error: string;
}

/**
 * AutoCorrect 模块类型定义
 */
interface AutocorrectModule {
    /** 格式化文本 */
    format: (text: string) => string;
    /** 针对特定文件类型格式化 */
    formatFor: (text: string, fileType: string) => string;
    /** 检查文本 */
    lintFor: (text: string, fileType: string) => LintResult;
    /** 加载配置 */
    loadConfig: (configJson: string) => void;
}

let autocorrectModule: AutocorrectModule | null = null;

/**
 * 懒加载 AutoCorrect 模块
 */
async function loadAutocorrect(): Promise<AutocorrectModule> {
    if (autocorrectModule) {
        return autocorrectModule;
    }

    const module = await import('@huacnlee/autocorrect');
    autocorrectModule = module as AutocorrectModule;
    return autocorrectModule;
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
    id: 'autocorrect',
    name: 'AutoCorrect 文案纠正',
    description: '自动纠正 CJK 文案中的空格、标点符号和拼写',

    async execute(context: RuleContext, config?: AutocorrectConfig): Promise<RuleResult> {
        const { document, filePath } = context;

        try {
            const autocorrect = await loadAutocorrect();

            // 如果提供了配置路径，加载配置
            if (config?.configPath) {
                try {
                    const { readFile } = await import('node:fs/promises');
                    const configContent = await readFile(config.configPath, 'utf-8');
                    autocorrect.loadConfig(configContent);
                } catch {
                    // 配置文件不存在或读取失败，使用默认配置
                }
            }

            // 根据文件路径推断文件类型
            const fileType = inferFileType(filePath);

            // 执行格式化
            const formatted = autocorrect.formatFor(document, fileType);

            const modified = formatted !== document;

            return {
                content: formatted,
                modified,
                messages: modified ? [`已应用 AutoCorrect 纠正 (${fileType} 格式)`] : ['无需纠正'],
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
    const ext = filePath.toLowerCase().split('.').pop();

    const typeMap: Record<string, string> = {
        md: 'markdown',
        markdown: 'markdown',
        txt: 'text',
        html: 'html',
        htm: 'html',
        xml: 'xml',
        json: 'json',
        yaml: 'yaml',
        yml: 'yaml',
        js: 'javascript',
        ts: 'typescript',
        jsx: 'jsx',
        tsx: 'tsx',
        css: 'css',
        scss: 'scss',
        less: 'less',
        py: 'python',
        rb: 'ruby',
        java: 'java',
        go: 'go',
        rs: 'rust',
        c: 'c',
        cpp: 'cpp',
        h: 'c',
        hpp: 'cpp',
        sh: 'shell',
        bash: 'shell',
        zsh: 'shell',
        sql: 'sql',
    };

    return typeMap[ext || ''] || 'text';
}
