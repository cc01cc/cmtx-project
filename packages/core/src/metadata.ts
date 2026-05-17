/**
 * Markdown 元数据处理模块
 *
 * @module metadata
 * @description
 * 提供 Markdown 文档元数据的提取、转换和管理功能。
 *
 * @remarks
 * ## 功能概述
 *
 * 本模块专注于处理 Markdown 文档的元数据，包括：
 * - 从文件路径提取文档元数据（支持 Frontmatter YAML、Heading、Filename）
 * - 标题与 Frontmatter 的相互转换
 * - 章节标题的提取（指定等级范围）
 * - Frontmatter 字段的更新和删除
 *
 * ## 核心功能
 *
 * ### 元数据提取与转换
 * - {@link extractMetadata} - 从文件提取文档元数据
 * - {@link convertHeadingToFrontmatter} - 将标题转换为 Frontmatter
 * - {@link removeFrontmatter} - 移除 Frontmatter 部分
 *
 * ### 章节标题处理
 * - {@link extractSectionHeadings} - 提取指定等级范围的章节标题
 *
 * ### Frontmatter 管理
 * - {@link upsertFrontmatterFields} - 更新或添加 Frontmatter 字段
 *
 * ## 技术特点
 *
 * - 使用逐行解析处理 frontmatter 边界（状态机）
 * - 不依赖外部 AST 解析库
 * - 支持文件路径和字符串双输入模式
 * - 高性能，低依赖
 *
 * ## 参考项目
 *
 * - [gray-matter](https://github.com/jonschlinkert/gray-matter) - Node.js frontmatter 解析标准库
 * - [Jekyll](https://jekyllrb.com/docs/frontmatter/) - 静态站点生成器，frontmatter 约定来源
 * - [section-matter](https://github.com/cmti-tig/term) - 章节级 frontmatter 解析实现
 *
 * @see {@link splitFrontmatter} - frontmatter 边界解析
 */

import yaml from "js-yaml";
import type {
    DocEntry,
    FrontmatterUpdateResult,
    FrontmatterValue,
    HeadingConvertOptions,
    SectionHeading,
    SectionHeadingExtractOptions,
    UpsertFrontmatterOptions,
} from "./types.js";

/**
 * 提取 Markdown 文本中的 frontmatter 内容
 *
 * @param markdown - Markdown 文本
 * @returns frontmatter 的 YAML 解析结果，无 frontmatter 时返回 undefined
 *
 * @example
 * ```typescript
 * const md = `---
 * title: "My Document"
 * date: 2024-01-01
 * ---
 *
 * Content`;
 *
 * const fm = extractFrontmatter(md);
 * fm?.title // "My Document"
 * fm?.date  // "2024-01-01"
 * ```
 * @public
 */
export function extractFrontmatter(markdown: string): Record<string, FrontmatterValue> | undefined {
    const { hasFrontmatter, data } = splitFrontmatter(markdown);
    if (!hasFrontmatter) return undefined;
    return parseYamlFrontmatter(data);
}

/**
 * 提取指定等级范围的章节标题
 *
 * 仅提取大标题（等级 1）之外的标题，默认提取 ## 到 ######。
 * 自动排除代码块（``` 或 ~~~ 包裹的内容）内的标题。
 *
 * @param markdown - Markdown 文本
 * @param options - 提取选项
 * @returns 章节标题数组，包含行号索引
 * @throws {Error} 参数验证失败时抛出错误
 *
 * @example
 * ```typescript
 * const md = `# Title\n## Section 1\n### Subsection\n## Section 2`;
 *
 * // 默认提取 ## 到 ######
 * extractSectionHeadings(md);
 * // [
 * //   { level: 2, text: 'Section 1', lineIndex: 1 },
 * //   { level: 3, text: 'Subsection', lineIndex: 2 },
 * //   { level: 2, text: 'Section 2', lineIndex: 3 }
 * // ]
 *
 * // 仅提取 ## 和 ###
 * extractSectionHeadings(md, { minLevel: 2, maxLevel: 3 });
 *
 * // 提取 ### 及以下的所有标题
 * extractSectionHeadings(md, { minLevel: 3 });
 *
 * // 代码块内的标题会被排除
 * const mdWithCode = `## Section 1\n\`\`\`bash\n# This is a comment, not a heading\n\`\`\`\n## Section 2`;
 * extractSectionHeadings(mdWithCode);
 * // [
 * //   { level: 2, text: 'Section 1', lineIndex: 0 },
 * //   { level: 2, text: 'Section 2', lineIndex: 4 }
 * // ]
 * ```
 * @public
 */
/**
 * 检测代码块边界
 */
function isCodeBlockBoundary(line: string): boolean {
    return /^```|^~~~/.test(line);
}

/**
 * 解析标题行
 */
function parseHeading(line: string): { level: number; text: string } | null {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (!match) {
        return null;
    }
    return {
        level: match[1].length,
        text: match[2].trim(),
    };
}

/**
 * 判断标题层级是否有效
 */
function isValidHeadingLevel(level: number, minLevel: number, maxLevel: number): boolean {
    return level >= minLevel && level <= maxLevel;
}

export function extractSectionHeadings(
    markdown: string,
    options: SectionHeadingExtractOptions = {},
): Array<SectionHeading & { lineIndex: number }> {
    const minLevel = options.minLevel ?? 2;
    const maxLevel = options.maxLevel ?? 6;

    // 参数验证
    if (minLevel < 1 || maxLevel > 6) {
        throw new Error("Heading levels must be between 1 and 6");
    }
    if (minLevel > maxLevel) {
        throw new Error("minLevel must be less than or equal to maxLevel");
    }

    const headings: Array<SectionHeading & { lineIndex: number }> = [];
    const lines = markdown.split(/\r?\n/g);
    let inCodeBlock = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // 检测代码块边界
        if (isCodeBlockBoundary(line)) {
            inCodeBlock = !inCodeBlock;
            continue;
        }

        // 跳过代码块内的内容
        if (inCodeBlock) {
            continue;
        }

        // 匹配标题
        const heading = parseHeading(line);
        if (heading && isValidHeadingLevel(heading.level, minLevel, maxLevel)) {
            headings.push({
                level: heading.level,
                text: heading.text,
                lineIndex: i,
            });
        }
    }

    return headings;
}

/**
 * 将指定等级的标题转换为 Frontmatter
 *
 * 如果文档已有 Frontmatter，仅更新其中的 `title` 字段；否则新建 Frontmatter。
 *
 * @param markdown - Markdown 文本
 * @param options - 转换选项
 * @returns 转换后的 Markdown 文本
 *
 * @example
 * ```typescript
 * // 简单转换
 * const result = convertHeadingToFrontmatter('# My Title\n\nContent...');
 * // 返回：
 * // ---
 * // title: "My Title"
 * // ---
 * //
 * // Content...
 *
 * // 保留现有 Frontmatter，仅更新 title
 * const md = '---\nauthor: "Alice"\n---\n# My Title\n\nContent...';
 * convertHeadingToFrontmatter(md);
 * // 返回：
 * // ---
 * // author: "Alice"
 * // title: "My Title"
 * // ---
 * //
 * // Content...
 * ```
 * @public
 */
export function convertHeadingToFrontmatter(
    markdown: string,
    options: HeadingConvertOptions = {},
): string {
    const { format = "yaml", headingLevel = 1 } = options;

    if (format !== "yaml") {
        throw new Error(
            `Unsupported frontmatter format: ${String(format)}. Only YAML is currently supported.`,
        );
    }

    // 查找指定等级的标题
    const headingRegex = new RegExp(String.raw`^${"#".repeat(headingLevel)}\s+(.+)$`, "m");
    const headingMatch = headingRegex.exec(markdown);

    if (!headingMatch) {
        // 没有找到指定等级的标题，返回原文档
        return markdown;
    }

    const titleText = headingMatch[1].trim();

    // 提取并更新 title，同时从正文中移除标题
    const cleanMarkdown = markdown.replace(headingMatch[0], "").trimStart();

    // 如果已经存在 Frontmatter，则使用 upsert 逻辑合并
    const { hasFrontmatter } = splitFrontmatter(markdown);
    if (hasFrontmatter) {
        const result = upsertFrontmatterFields(cleanMarkdown, { title: titleText });
        return result.markdown;
    }

    // 否则生成新 Frontmatter
    const metadata: Record<string, FrontmatterValue> = {
        title: titleText,
    };
    const frontmatterStr = generateFrontmatterYaml(metadata);

    return `${frontmatterStr}\n\n${cleanMarkdown}`;
}

/**
 * 更新或添加 Frontmatter 字段
 *
 * 支持灵活的字段操作：
 * - 相同 key 时更新 value
 * - 新 key 时添加字段
 * - 值为 null 时设置字段为 null（在 YAML 中显示为 null）
 * - 跟踪修改细节（新增、更新、未变化）
 *
 * @param markdown - Markdown 文本
 * @param fields - 要更新或新增的字段对象
 * @param options - 更新选项
 * @returns 包含修改摘要和完整 Markdown 的结果对象
 *
 * @example
 * ```typescript
 * const md = `---\nauthor: "Alice"\n---\n\nContent...`;
 *
 * const result = upsertFrontmatterFields(md, {
 *   author: 'Bob',           // 更新
 *   date: '2026-02-07',      // 新增
 *   tags: ['a', 'b'],        // 新增数组
 *   order: 1,                // 新增数字
 *   published: true,         // 新增布尔
 *   description: null        // 设置为 null
 * });
 *
 * console.log(result.updated);  // ['author']
 * console.log(result.added);    // ['date', 'tags', 'order', 'published', 'description']
 * ```
 * @public
 */
export function upsertFrontmatterFields(
    markdown: string,
    fields: Record<string, FrontmatterValue>,
    options: UpsertFrontmatterOptions = {},
): FrontmatterUpdateResult {
    const { format = "yaml", createIfMissing = true } = options;

    if (format !== "yaml") {
        throw new Error(
            `Unsupported frontmatter format: ${String(format)}. Only YAML is currently supported.`,
        );
    }

    const result: FrontmatterUpdateResult = {
        success: false,
        added: [],
        updated: [],
        unchanged: [],
        markdown,
    };

    // 提取现有 Frontmatter
    const { hasFrontmatter, data, content } = splitFrontmatter(markdown);
    let existingMetadata: Record<string, FrontmatterValue> = {};
    let cleanMarkdown = markdown;
    const hadFrontmatter = hasFrontmatter;

    if (hasFrontmatter) {
        try {
            existingMetadata = parseYamlFrontmatter(data);
        } catch {
            // 解析失败，作为空对象处理
        }
        cleanMarkdown = content.trim();
    }

    // 如果没有现有 Frontmatter 且 createIfMissing=false，返回原文档
    if (!hadFrontmatter && !createIfMissing) {
        result.success = true;
        return result;
    }

    // 合并字段，追踪变化
    const merged: Record<string, FrontmatterValue> = { ...existingMetadata };

    for (const [key, newValue] of Object.entries(fields)) {
        processFieldUpdate(key, newValue, merged, result);
    }

    // 生成新 Frontmatter
    let newFrontmatter = "";

    if (Object.keys(merged).length > 0) {
        newFrontmatter = generateFrontmatterYaml(merged);
    }

    // 组合结果
    result.markdown = newFrontmatter ? `${newFrontmatter}\n\n${cleanMarkdown}` : cleanMarkdown;

    result.success = true;
    return result;
}

/**
 * 移除 Frontmatter 部分
 *
 * 仅移除 Frontmatter，保留文档内容完整。
 *
 * @param markdown - Markdown 文本
 * @returns 移除 Frontmatter 后的 Markdown 文本
 *
 * @example
 * ```typescript
 * const md = `---\nauthor: "Alice"\n---\n\nContent here`;
 * removeFrontmatter(md);
 * // 返回：'Content here'
 *
 * // 无 Frontmatter 的文档返回原样
 * removeFrontmatter('Just content');
 * // 返回：'Just content'
 * ```
 * @public
 */
/**
 * Frontmatter 解析结果
 */
export interface SplitFrontmatterResult {
    hasFrontmatter: boolean;
    data: string;
    content: string;
}

/**
 * 逐行解析 frontmatter 边界
 *
 * 使用状态机逐行解析，参考 section-matter 和 gray-matter 实现。
 * 按照 Jekyll/gray-matter 约定：
 * - frontmatter 必须在文件第一行
 * - 空 frontmatter (`---`) 是合法的
 * - 内容中的 `---` 不会影响解析
 *
 * @param input - Markdown 文本
 * @returns 解析结果，包含 hasFrontmatter、data（原始 YAML）、content（去除 frontmatter 后的内容）
 * @see gray-matter {@link https://github.com/jonschlinkert/gray-matter}
 * @see Jekyll Frontmatter {@link https://jekyllrb.com/docs/frontmatter/}
 */
export function splitFrontmatter(input: string): SplitFrontmatterResult {
    const lines = input.split(/\r?\n/);
    const stack: string[] = [];
    const dataLines: string[] = [];
    const contentLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        const len = stack.length;

        if (isDelimiter(trimmed)) {
            if (trimmed.length === 3 && i !== 0) {
                // Delimiter at position other than start
                if (len === 0) {
                    // No frontmatter started yet, treat as content
                    contentLines.push(line);
                } else if (len === 1) {
                    // Closing delimiter - transition from data to content
                    stack.push(trimmed);
                } else {
                    // len >= 2, already closed, treat as content
                    contentLines.push(line);
                }
                continue;
            }

            if (len === 2) {
                // Already closed, treat as content
                stack.push(trimmed);
                continue;
            }

            // First delimiter (i === 0 or trimmed.length !== 3)
            stack.push(trimmed);
            continue;
        }

        // Not a delimiter line
        if (len === 1) {
            // Between opening and closing delimiter
            dataLines.push(line);
        } else {
            contentLines.push(line);
        }
    }

    const hasFrontmatter = stack.length >= 2;

    if (!hasFrontmatter) {
        const allContent = [...contentLines, ...dataLines].join("\n");
        return { hasFrontmatter: false, data: "", content: allContent };
    }

    return {
        hasFrontmatter,
        data: dataLines.join("\n"),
        content: contentLines.join("\n"),
    };
}

function isDelimiter(line: string): boolean {
    if (!line.startsWith("---")) return false;
    if (line.length > 3 && line[3] === "-") return false;
    return true;
}

export function removeFrontmatter(markdown: string): string {
    const { hasFrontmatter, content } = splitFrontmatter(markdown);
    if (hasFrontmatter) {
        return content.trim();
    }
    return markdown.trim();
}

/**
 * 解析 YAML Frontmatter 内容
 *
 * 使用 js-yaml 标准库解析，保留原生 YAML 类型：
 * - string / number / boolean 保留原始类型
 * - 数组元素同样保留原始类型
 * - Date 转为 ISO date string
 *
 * **不支持的结构：**
 * - 复杂对象/嵌套结构
 * - 多行字符串（|、>）
 * - 锚点和别名
 *
 * @param content - YAML 内容
 * @returns 解析后的 frontmatter 字段
 * @public
 */
export function parseYamlFrontmatter(content: string): Record<string, FrontmatterValue> {
    try {
        const parsed = yaml.load(content) as Record<string, unknown> | null;
        if (!parsed || typeof parsed !== "object") {
            return {};
        }
        return normalizeFrontmatterValues(parsed);
    } catch {
        return {};
    }
}

/**
 * 标准化 Frontmatter 值为支持的类型
 *
 * @param obj - 解析后的对象
 * @returns 标准化后的对象
 */
function normalizeFrontmatterValues(
    obj: Record<string, unknown>,
): Record<string, FrontmatterValue> {
    const result: Record<string, FrontmatterValue> = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value === null) {
            result[key] = null;
        } else if (typeof value === "string") {
            result[key] = value;
        } else if (typeof value === "number") {
            result[key] = value;
        } else if (typeof value === "boolean") {
            result[key] = value;
        } else if (Array.isArray(value)) {
            result[key] = normalizeFmArray(value);
        } else if (value instanceof Date) {
            result[key] = value.toISOString().split("T")[0];
        }
        // 忽略其他类型（object 等）
    }
    return result;
}

function normalizeFmArray(arr: unknown[]): FrontmatterValue[] {
    return arr.map((item) => {
        if (typeof item === "string") return item;
        if (typeof item === "number") return item;
        if (typeof item === "boolean") return item;
        if (item === null) return null;
        if (Array.isArray(item)) return normalizeFmArray(item);
        // oxlint no-base-to-string: catch-all for unknown types
        return String(item);
    });
}

/**
 * 生成 YAML Frontmatter 字符串
 *
 * 委托给 js-yaml.dump 进行序列化，确保与 js-yaml.load 的行为对称。
 *
 * @param obj - 要序列化的对象
 * @returns Frontmatter 字符串（含 --- 头尾）
 * @public
 */
export function generateFrontmatterYaml(obj: Record<string, FrontmatterValue>): string {
    const content = yaml.dump(obj, {
        indent: 2,
        lineWidth: -1,
        quotingType: '"',
        forceQuotes: false,
        noRefs: true,
        sortKeys: false,
    });
    return `---\n${content}---`;
}

/**
 * 处理单个字段的更新
 *
 * @internal
 */
function processFieldUpdate(
    key: string,
    newValue: FrontmatterValue,
    merged: Record<string, FrontmatterValue>,
    result: FrontmatterUpdateResult,
): void {
    if (key in merged) {
        // 比较值
        const oldValue = merged[key];
        const isSame = JSON.stringify(oldValue) === JSON.stringify(newValue);

        if (isSame) {
            result.unchanged.push(key);
        } else {
            result.updated.push(key);
            merged[key] = newValue;
        }
    } else {
        result.added.push(key);
        merged[key] = newValue;
    }
}

/**
 * 从 Frontmatter 中删除指定的字段
 *
 * 删除指定的字段，保留其他字段。如果没有 Frontmatter 或所有字段都被删除，
 * 则保留或移除整个 Frontmatter 块。
 *
 * @param markdown - Markdown 文本
 * @param fieldKeys - 要删除的字段名数组
 * @returns 删除后的 Markdown 文本
 *
 * @example
 * ```typescript
 * const md = `---\nauthor: "Alice"\ndraft: true\ndate: "2026-02-07"\n---\n\nContent...`;
 *
 * const result = deleteFrontmatterFields(md, ['draft', 'date']);
 * // 返回：
 * // ---
 * // author: "Alice"
 * // ---
 * //
 * // Content...
 *
 * // 删除所有字段后会移除整个 Frontmatter
 * deleteFrontmatterFields(md, ['author', 'draft', 'date']);
 * // 返回：'Content...'
 * ```
 * @public
 */
export function deleteFrontmatterFields(markdown: string, fieldKeys: string[]): string {
    // 提取现有 Frontmatter
    const { hasFrontmatter, data, content } = splitFrontmatter(markdown);
    if (!hasFrontmatter) {
        // 没有 Frontmatter，返回原文档
        return markdown;
    }

    // 解析 Frontmatter
    const metadata = parseYamlFrontmatter(data);

    // 删除指定字段
    for (const key of fieldKeys) {
        delete metadata[key];
    }

    // 获取内容部分
    const cleanMarkdown = content.trim();

    // 生成新 Frontmatter（如果没有剩余字段，保留空 frontmatter 块）
    if (Object.keys(metadata).length > 0) {
        const newFrontmatter = generateFrontmatterYaml(metadata);
        return `${newFrontmatter}\n\n${cleanMarkdown}`;
    }

    // 保留空的 frontmatter 块，移除整个块应使用 removeFrontmatter
    return `---\n---\n\n${cleanMarkdown}`;
}

/**
 * 从 Markdown 文本中提取文档标题
 *
 * 优先级：
 * 1. Frontmatter 中的 title 字段（如果存在）
 * 2. 文档顶部的一级标题（# 开头的行）
 * 3. 如果都不存在，返回 undefined
 *
 * @param markdown - Markdown 文本
 * @returns 提取到的标题，或 undefined 如果不存在
 *
 * @example
 * ```typescript
 * // Frontmatter 中有 title
 * const md1 = `---\ntitle: "My Title"\n---\n\n# Heading`;
 * extractTitleFromMarkdown(md1);  // 返回 "My Title"
 *
 * // 只有一级标题
 * const md2 = `# My Heading\n\nContent`;
 * extractTitleFromMarkdown(md2);  // 返回 "My Heading"
 *
 * // 都没有
 * const md3 = `## Sub Heading\n\nContent`;
 * extractTitleFromMarkdown(md3);  // 返回 undefined
 * ```
 * @public
 */
export function extractTitleFromMarkdown(markdown: string): string | undefined {
    // 首先检查 Frontmatter 中的 title 字段
    const { hasFrontmatter, data } = splitFrontmatter(markdown);
    if (hasFrontmatter) {
        try {
            const frontmatter = parseYamlFrontmatter(data);
            if (frontmatter.title) {
                const title = frontmatter.title;
                // 如果是数组，取第一个元素；如果是字符串，直接返回；null 则继续检查
                if (Array.isArray(title)) {
                    const first = title[0];
                    return typeof first === "string" ? first : undefined;
                }
                if (typeof title === "string") {
                    return title;
                }
            }
        } catch {
            // Frontmatter 解析失败，继续检查标题
        }
    }

    // 如果 Frontmatter 中没有 title，检查顶部一级标题
    const titleMatch = markdown.match(/^#\s+(.+)$/m);
    if (titleMatch) {
        return titleMatch[1].trim();
    }

    // 都不存在
    return undefined;
}

/**
 * 从 Markdown 文档中提取 frontmatter 的指定字段值
 *
 * 使用 {@link splitFrontmatter} 和 {@link parseYamlFrontmatter} 函数解析 frontmatter，
 * 然后返回指定字段的值。
 *
 * @param markdown - Markdown 文本
 * @param fieldName - 要提取的字段名称
 * @returns 字段值（字符串形式），如果字段不存在或 frontmatter 解析失败则返回 undefined
 *
 * @example
 * ```typescript
 * const md = `---
 * title: "My Title"
 * date: 2024-01-01
 * tags:
 *   - tag1
 *   - tag2
 * ---
 *
 * Content...`;
 *
 * extractFrontmatterField(md, 'title');  // "My Title"
 * extractFrontmatterField(md, 'date');   // "2024-01-01"
 * extractFrontmatterField(md, 'tags');   // "tag1, tag2"
 * extractFrontmatterField(md, 'author'); // undefined
 * ```
 * @public
 */
export function extractFrontmatterField(markdown: string, fieldName: string): string | undefined {
    const { data } = splitFrontmatter(markdown);
    if (!data) {
        return undefined;
    }

    const frontmatterObj = parseYamlFrontmatter(data);
    const value = frontmatterObj[fieldName];

    if (value === null || value === undefined) {
        return undefined;
    }

    if (typeof value === "string") {
        return value;
    }

    if (Array.isArray(value)) {
        return value.join(", ");
    }

    return String(value);
}

/**
 * 对文档条目按 sidebar_order 排序
 *
 * 排序规则：
 * 1. 有 sidebar_order（number）的按数字升序排列
 * 2. 无 sidebar_order 的按 title 字母序排列
 * 3. 规则 2 的条目始终排在规则 1 之后
 *
 * @param entries - 文档条目数组
 * @param field - 排序依据的 frontmatter 字段名（默认 "sidebar_order"）
 * @returns 新数组（不修改原数组）
 * @public
 */
export function sortByOrder<T extends DocEntry>(entries: T[], field = "sidebar_order"): T[] {
    return [...entries].sort((a, b) => {
        const aOrder = a.frontmatter[field];
        const bOrder = b.frontmatter[field];
        const aHasOrder = typeof aOrder === "number";
        const bHasOrder = typeof bOrder === "number";

        if (aHasOrder && bHasOrder) {
            return aOrder - bOrder;
        }
        if (aHasOrder) return -1;
        if (bHasOrder) return 1;

        return a.title.localeCompare(b.title);
    });
}
