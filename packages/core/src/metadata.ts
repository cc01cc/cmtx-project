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
 * @see {@link DocumentMetadata} - 文档元数据类型
 * @see {@link MetadataExtractOptions} - 提取选项
 * @see {@link parseFrontmatter} - frontmatter 边界解析
 */

import * as fs from "node:fs";
import * as path from "node:path";
import yaml from "js-yaml";
import type {
    DocumentMetadata,
    FrontmatterUpdateResult,
    FrontmatterValue,
    HeadingConvertOptions,
    MetadataExtractOptions,
    SectionHeading,
    SectionHeadingExtractOptions,
    UpsertFrontmatterOptions,
} from "./types.js";

/**
 * 从文件提取文档元数据
 *
 * 支持多数据源，按优先级依次尝试：
 * 1. Frontmatter YAML（优先级最高）- 从 `---` YAML 块中提取
 * 2. Markdown Heading - 提取指定等级的标题（如 `# 标题`）
 * 3. 文件名（备选方案）- 当前两者都不存在时，使用文件名（不含扩展名）
 *
 * @param filePath - 本地 Markdown 文件的绝对或相对路径
 * @param options - 提取选项
 * @returns 文档元数据对象
 * @throws {Error} 文件不存在或无权限读取时抛出错误
 *
 * @example
 * ```typescript
 * // 从文件提取元数据
 * const metadata = extractMetadata('/path/to/document.md');
 * console.log(metadata.title); // 从 Frontmatter 或标题中提取
 *
 * // 指定大标题等级
 * const metadata2 = extractMetadata('/path/to/doc.md', { headingLevel: 2 });
 * ```
 * @public
 */
export function extractMetadata(
    filePath: string,
    options: MetadataExtractOptions = {},
): DocumentMetadata {
    const { headingLevel = 1 } = options;

    // 规范化路径
    const absolutePath = path.resolve(filePath);

    // 读取文件内容
    let content: string;
    try {
        content = fs.readFileSync(absolutePath, "utf-8");
    } catch (error) {
        const err = error as NodeJS.ErrnoException;
        if (err.code === "ENOENT") {
            throw new Error(`File not found: ${absolutePath}`, { cause: error });
        }
        if (err.code === "EACCES") {
            throw new Error(`Permission denied: ${absolutePath}`, { cause: error });
        }
        throw new Error(`Failed to read file: ${absolutePath}`, { cause: error });
    }

    const metadata: DocumentMetadata = { title: "" };

    // 1. 尝试从 Frontmatter 中提取元数据
    const { hasFrontmatter, data } = parseFrontmatter(content);
    if (hasFrontmatter) {
        try {
            const parsed = parseYamlFrontmatter(data);
            Object.assign(metadata, parsed);
        } catch {
            // Frontmatter 解析失败时继续
        }
    }

    // 2. 如果 Frontmatter 中没有标题，从指定等级的标题中提取
    if (!metadata.title) {
        const headingRegex = new RegExp(String.raw`^${"#".repeat(headingLevel)}\s+(.+)$`, "m");
        const headingMatch = headingRegex.exec(content);
        if (headingMatch) {
            metadata.title = headingMatch[1].trim();
        }
    }

    // 3. 如果仍无标题，使用文件名（去掉扩展名）
    if (!metadata.title) {
        const filename = path.basename(absolutePath, path.extname(absolutePath));
        metadata.title = filename;
    }

    return metadata;
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
    const { hasFrontmatter } = parseFrontmatter(markdown);
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
 * @param fields - 要更新或新增的字段对象（值可以是字符串、字符串数组或 null）
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
 *   description: null        // 设置为 null
 * });
 *
 * console.log(result.updated);  // ['author']
 * console.log(result.added);    // ['date', 'tags', 'description']
 * ```
 * @public
 */
export function upsertFrontmatterFields(
    markdown: string,
    fields: Record<string, string | string[] | null>,
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
    const { hasFrontmatter, data, content } = parseFrontmatter(markdown);
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
export interface FrontmatterParseResult {
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
export function parseFrontmatter(input: string): FrontmatterParseResult {
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
    const { hasFrontmatter, content } = parseFrontmatter(markdown);
    if (hasFrontmatter) {
        return content.trim();
    }
    return markdown.trim();
}

/**
 * 解析 YAML Frontmatter 内容
 *
 * 使用自定义正则表达式解析，轻量级实现。所有值统一返回为字符串或字符串数组，简化解析逻辑。
 * 如需进一步的类型转换（如 boolean、number），由下游代码自行处理。
 *
 * **支持的结构：**
 * - 基础值：转换为字符串返回
 * - 数组：单行 `[a,b,c]` 和多行 `- item` 格式
 * - 简单键值对
 *
 * **不支持的结构：**
 * - 复杂对象/嵌套结构
 * - 多行字符串（|、>）
 * - 日期/时间类型
 * - 锚点和别名
 * - 流式和块式混合
 *
 * @note 如需完整 YAML 规范支持，使用 @cmtx/metadata 的 `parseFullFrontmatter()` 函数
 *
 * @param content - YAML 内容
 * @returns 解析后的对象（所有值均为字符串、字符串数组或 null）
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
 * @returns 标准化后的对象，值类型为 string | string[] | null
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
        } else if (Array.isArray(value)) {
            result[key] = value.map(String);
        } else if (value instanceof Date) {
            result[key] = value.toISOString().split("T")[0];
        }
        // 忽略其他类型（boolean, number, object 等）
    }
    return result;
}

/**
 * 生成 YAML Frontmatter 字符串
 *
 * @param obj - 要序列化的对象
 * @returns Frontmatter 字符串
 * @public
 */
export function generateFrontmatterYaml(obj: Record<string, FrontmatterValue>): string {
    const lines: string[] = [];

    // 判断字符串是否需要引导
    const needsQuoting = (str: string) => {
        if (!str) return false;
        if (str.includes("\n")) return true;

        const trimmed = str.trim();
        return (
            trimmed.includes(": ") ||
            trimmed.includes("#") ||
            /^[[\]{}&*!%@`|>"-]/.test(trimmed) ||
            /^\d+$/.test(trimmed)
        );
    };

    const formatValue = (val: unknown) => {
        const str = String(val);
        if (needsQuoting(str)) {
            const escaped = str.replaceAll('"', String.raw`\"`).replaceAll("\n", String.raw`\n`);
            return `"${escaped}"`;
        }
        return str;
    };

    for (const [key, value] of Object.entries(obj)) {
        if (Array.isArray(value)) {
            lines.push(`${key}:`);
            for (const item of value) {
                lines.push(`  - ${formatValue(item)}`);
            }
        } else if (value === null) {
            // null 值显示为 YAML null
            lines.push(`${key}: null`);
        } else if (value === undefined) {
        } else {
            lines.push(`${key}: ${formatValue(value)}`);
        }
    }

    const content = lines.join("\n");
    return `---\n${content}\n---`;
}

/**
 * 处理单个字段的更新
 *
 * @internal
 */
function processFieldUpdate(
    key: string,
    newValue: string | string[] | null,
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
    const { hasFrontmatter, data, content } = parseFrontmatter(markdown);
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

    // 生成新 Frontmatter（如果还有字段）
    if (Object.keys(metadata).length > 0) {
        const newFrontmatter = generateFrontmatterYaml(metadata);
        return `${newFrontmatter}\n\n${cleanMarkdown}`;
    }

    // 没有剩余字段，只返回内容
    return cleanMarkdown;
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
    const { hasFrontmatter, data } = parseFrontmatter(markdown);
    if (hasFrontmatter) {
        try {
            const frontmatter = parseYamlFrontmatter(data);
            if (frontmatter.title) {
                const title = frontmatter.title;
                // 如果是数组，取第一个元素；如果是字符串，直接返回；null 则继续检查
                if (Array.isArray(title)) {
                    return title[0];
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
 * 使用 {@link parseFrontmatter} 和 {@link parseYamlFrontmatter} 函数解析 frontmatter，
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
    const { data } = parseFrontmatter(markdown);
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
