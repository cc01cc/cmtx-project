/**
 * 平台适配注册表
 *
 * @module registry
 * @description
 * 提供平台适配器的注册和管理功能，支持：
 * - 内置平台（wechat, zhihu, csdn）
 * - 用户自定义平台注册
 * - 平台校验和渲染
 *
 * @remarks
 * ## 内置平台
 *
 * 规则从 YAML 文件加载（`src/rules/builtin/*.yaml`），
 * 校验器在代码中实现。
 *
 * ## 自定义平台
 *
 * ```typescript
 * import { registerPlatform, registerPlatformFromFile } from '@cmtx/publish';
 *
 * // 同步注册
 * registerPlatform('medium', [
 *   { name: 'strip frontmatter', match: '^---[\\s\\S]*?---\\n+', replace: '', flags: 'g' }
 * ]);
 *
 * // 从 YAML 文件注册
 * await registerPlatformFromFile('medium', './medium.yaml');
 * ```
 */

import { applyAdaptRules } from '../rules/apply.js';
import { loadAllBuiltinPlatforms, loadPlatformRules } from '../rules/loader.js';
import type {
    AdaptPlatform,
    AdaptResult,
    AdaptRule,
    PlatformAdapter,
    RenderResult,
    ValidationIssue,
} from '../types.js';
import { renderWechatMarkdown } from './wechat/render.js';

const BUILTIN_PLATFORMS = ['wechat', 'zhihu', 'csdn'] as const satisfies readonly AdaptPlatform[];

function findLineAndColumn(content: string, index: number): { line: number; column: number } {
    const prefix = content.slice(0, index);
    const lines = prefix.split('\n');

    return {
        line: lines.length,
        column: (lines.at(-1)?.length ?? 0) + 1,
    };
}

function collectIssues(
    content: string,
    regex: RegExp,
    issueFactory: (matchText: string) => Omit<ValidationIssue, 'line' | 'column'>
): ValidationIssue[] {
    const globalFlags = regex.flags.includes('g') ? regex.flags : `${regex.flags}g`;
    const globalRegex = new RegExp(regex.source, globalFlags);
    const issues: ValidationIssue[] = [];

    for (const match of content.matchAll(globalRegex)) {
        const startIndex = match.index ?? 0;
        const position = findLineAndColumn(content, startIndex);
        issues.push({
            ...issueFactory(match[0]),
            line: position.line,
            column: position.column,
        });
    }

    return issues;
}

// ==================== 校验器（代码实现） ====================

function validateWechat(markdown: string): ValidationIssue[] {
    return [
        ...collectIssues(markdown, /^---[\s\S]*?---\n+/g, () => ({
            code: 'wechat/frontmatter',
            level: 'warning' as const,
            message: 'WeChat content should not include YAML frontmatter.',
            fixable: true,
        })),
        ...collectIssues(markdown, /^# .+$/gm, () => ({
            code: 'wechat/h1-body',
            level: 'warning' as const,
            message: 'WeChat body content should start at H2 because the title is set separately.',
            fixable: true,
        })),
        ...collectIssues(markdown, /(?<!!)\[[^\]]+\]\(https?:\/\/[^)\s]+\)/g, () => ({
            code: 'wechat/external-link',
            level: 'info' as const,
            message: 'WeChat published articles do not keep external links clickable.',
            fixable: true,
        })),
        ...collectIssues(markdown, /!\[[^\]]*\]\((?!https?:\/\/|\/\/|data:)[^)\s]+\)/g, () => ({
            code: 'wechat/local-image',
            level: 'warning' as const,
            message: 'Local image paths should be uploaded before publishing to WeChat.',
            fixable: false,
        })),
    ];
}

function validateZhihu(markdown: string): ValidationIssue[] {
    return [
        ...collectIssues(markdown, /^---[\s\S]*?---\n+/g, () => ({
            code: 'zhihu/frontmatter',
            level: 'warning' as const,
            message: 'Zhihu articles should not contain YAML frontmatter.',
            fixable: true,
        })),
        ...collectIssues(markdown, /^#{4,} .+$/gm, () => ({
            code: 'zhihu/deep-heading',
            level: 'info' as const,
            message: 'Zhihu keeps best readability when headings deeper than H3 are collapsed.',
            fixable: true,
        })),
    ];
}

function validateCsdn(markdown: string): ValidationIssue[] {
    return [
        ...collectIssues(markdown, /^---[\s\S]*?---\n+/g, () => ({
            code: 'csdn/frontmatter',
            level: 'warning' as const,
            message: 'CSDN markdown should not contain YAML frontmatter.',
            fixable: true,
        })),
        ...collectIssues(markdown, /^```(?:js|ts|py|sh|yml)$/gm, (matchText) => ({
            code: 'csdn/code-fence-alias',
            level: 'info' as const,
            message: `Code fence alias "${matchText.slice(3)}" should be normalized for CSDN highlighting.`,
            fixable: true,
        })),
    ];
}

const builtinValidators: Record<AdaptPlatform, (markdown: string) => ValidationIssue[]> = {
    wechat: validateWechat,
    zhihu: validateZhihu,
    csdn: validateCsdn,
};

// ==================== 规则缓存 ====================

let builtinRulesCache: Map<string, AdaptRule[]> | null = null;

async function getBuiltinRulesCache(): Promise<Map<string, AdaptRule[]>> {
    if (!builtinRulesCache) {
        builtinRulesCache = await loadAllBuiltinPlatforms();
    }
    return builtinRulesCache;
}

async function getBuiltinRules(platform: string): Promise<AdaptRule[]> {
    const cache = await getBuiltinRulesCache();
    const rules = cache.get(platform);
    if (!rules) {
        throw new Error(`Unknown builtin platform: ${platform}`);
    }
    return rules.map((rule) => ({ ...rule }));
}

// ==================== 自定义平台注册 ====================

interface CustomPlatform {
    rules: AdaptRule[];
    validator?: (markdown: string) => ValidationIssue[];
}

const customPlatforms = new Map<string, CustomPlatform>();

/**
 * 注册自定义平台
 *
 * @param name - 平台名称
 * @param rules - 适配规则数组
 * @param validator - 可选的校验函数
 */
export function registerPlatform(
    name: string,
    rules: AdaptRule[],
    validator?: (markdown: string) => ValidationIssue[]
): void {
    customPlatforms.set(name, { rules, validator });
}

/**
 * 从 YAML 文件注册自定义平台
 *
 * @param name - 平台名称
 * @param ruleFile - YAML 规则文件路径
 * @param validator - 可选的校验函数
 */
export async function registerPlatformFromFile(
    name: string,
    ruleFile: string,
    validator?: (markdown: string) => ValidationIssue[]
): Promise<void> {
    const rules = await loadPlatformRules(ruleFile);
    registerPlatform(name, rules, validator);
}

/**
 * 取消注册自定义平台
 *
 * @param name - 平台名称
 */
export function unregisterPlatform(name: string): void {
    customPlatforms.delete(name);
}

/**
 * 获取所有已注册的平台名称
 *
 * @returns 平台名称数组
 */
export function getRegisteredPlatforms(): string[] {
    return [...BUILTIN_PLATFORMS, ...customPlatforms.keys()];
}

// ==================== 平台适配器 ====================

async function buildPlatformAdapter(platform: string): Promise<PlatformAdapter> {
    // 检查是否为自定义平台
    const custom = customPlatforms.get(platform);
    if (custom) {
        return {
            name: platform,
            rules: custom.rules.map((r) => ({ ...r })),
            validate: custom.validator ?? (() => []),
            adapt(markdown: string): AdaptResult {
                return applyAdaptRules(
                    markdown,
                    custom.rules.map((r) => ({ ...r }))
                );
            },
            render(markdown: string): RenderResult {
                const adapted = applyAdaptRules(
                    markdown,
                    custom.rules.map((r) => ({ ...r }))
                );
                return {
                    content: adapted.content,
                    format: 'markdown',
                    platform: platform as AdaptPlatform,
                };
            },
        };
    }

    // 内置平台
    const rules = await getBuiltinRules(platform);
    const validator = builtinValidators[platform as AdaptPlatform];

    return {
        name: platform,
        rules,
        validate: validator ?? (() => []),
        adapt(markdown: string): AdaptResult {
            return applyAdaptRules(
                markdown,
                rules.map((r) => ({ ...r }))
            );
        },
        render(markdown: string): RenderResult {
            if (platform === 'wechat') {
                return renderWechatMarkdown(
                    markdown,
                    rules.map((r) => ({ ...r }))
                );
            }

            const adapted = applyAdaptRules(
                markdown,
                rules.map((r) => ({ ...r }))
            );
            return {
                content: adapted.content,
                format: 'markdown',
                platform: platform as AdaptPlatform,
            };
        },
    };
}

// ==================== 公共 API ====================

/**
 * 获取支持的平台列表
 *
 * @returns 内置平台名称数组
 */
export function getSupportedPlatforms(): AdaptPlatform[] {
    return [...BUILTIN_PLATFORMS];
}

/**
 * 获取平台适配器
 *
 * @param platform - 平台名称
 * @returns 平台适配器
 *
 * @public
 */
export async function getPlatformAdapter(platform: AdaptPlatform): Promise<PlatformAdapter> {
    return buildPlatformAdapter(platform);
}

/**
 * 获取平台规则
 *
 * @param platform - 平台名称
 * @returns 规则数组的副本
 */
export async function getPlatformRules(platform: AdaptPlatform): Promise<AdaptRule[]> {
    const custom = customPlatforms.get(platform);
    if (custom) {
        return custom.rules.map((r) => ({ ...r }));
    }
    return getBuiltinRules(platform);
}

/**
 * 校验 Markdown 内容
 *
 * @param markdown - Markdown 文本
 * @param platform - 平台名称
 * @returns 校验问题列表
 *
 * @public
 */
export async function validateMarkdown(
    markdown: string,
    platform: AdaptPlatform
): Promise<ValidationIssue[]> {
    const adapter = await getPlatformAdapter(platform);
    return adapter.validate(markdown);
}

/**
 * 适配 Markdown 内容
 *
 * @param markdown - Markdown 文本
 * @param platform - 平台名称
 * @returns 适配结果
 *
 * @public
 */
export async function adaptMarkdown(
    markdown: string,
    platform: AdaptPlatform
): Promise<AdaptResult> {
    const adapter = await getPlatformAdapter(platform);
    return adapter.adapt(markdown);
}

/**
 * 渲染 Markdown 内容
 *
 * @param markdown - Markdown 文本
 * @param platform - 平台名称
 * @returns 渲染结果
 *
 * @public
 */
export async function renderMarkdown(
    markdown: string,
    platform: AdaptPlatform
): Promise<RenderResult> {
    const adapter = await getPlatformAdapter(platform);

    if (!adapter.render) {
        throw new TypeError(`Platform ${platform} does not support rendering.`);
    }

    return adapter.render(markdown);
}
