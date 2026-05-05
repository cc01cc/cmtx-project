export type ValidationLevel = "error" | "warning" | "info";

export interface ValidationIssue {
    code: string;
    level: ValidationLevel;
    message: string;
    line?: number;
    column?: number;
    fixable?: boolean;
}

// ==================== 元数据相关类型 (来自 normalize) ====================

/**
 * 文档元数据
 */
export interface MarkdownMetadata {
    /** 文档标题 */
    title?: string;
    /** 文档唯一标识符 */
    id?: string;
    /** 创建日期 */
    date?: string;
    /** 更新日期 */
    updated?: string;
    /** 版本号 */
    version?: string | number;
    /** 作者 */
    author?: string;
    /** 标签 */
    tags?: string[];
    /** 分类 */
    categories?: string[];
    /** 摘要 */
    summary?: string;

    /** 文件绝对路径 */
    abspath?: string;
    /** 文件名（basename） */
    filename?: string;
    /** 文件大小（字节） */
    size?: number;
    /** 文件创建时间 */
    ctime?: Date;
    /** 文件修改时间 */
    mtime?: Date;
    /** 文件访问时间 */
    atime?: Date;

    /** 自定义字段 */
    [key: string]: unknown;
}

/**
 * 文档状态快照（持久化于外部注册表）
 */
export interface DocumentState {
    /** 唯一标识符 */
    id: string;
    /** 全文件哈希（包含元数据，用于快速跳过） */
    fileHash: string;
    /** 正文哈希（排除元数据，用于检测内容变更） */
    bodyHash: string;
    /** 当前版本号 */
    version: number;
    /** 上次更新时间 */
    updated: string;
}

/**
 * 元数据提取选项
 */
export interface ExtractOptions {
    /** 是否提取所有标题 */
    extractAllHeadings?: boolean;
    /** 标题级别限制 */
    headingLevel?: number;
}

/**
 * 文档查询过滤条件
 */
export interface QueryFilter {
    /** 按 ID 查询 */
    id?: string;
    /** 按标题查询 */
    title?: string;
    /** 按作者查询 */
    author?: string;
    /** 按标签查询 */
    tag?: string;
    /** 按分类查询 */
    category?: string;
    /** 日期范围 */
    dateRange?: [string, string];
    /** 搜索文本 */
    searchText?: string;
}

/**
 * 文档列表选项
 */
export interface ListOptions {
    /** 是否递归搜索 */
    recursive?: boolean;
    /** 排序字段 */
    sortBy?: "date" | "title" | "id";
    /** 是否降序 */
    descending?: boolean;
}

// ==================== 加密 ID 相关类型 ====================

/**
 * FF1 加密选项
 */
export interface FF1EncryptOptions {
    /**
     * 进制基数
     * @default 36
     */
    radix?: number;

    /**
     * 是否添加卢恩校验码
     * 注意：追加校验码会使输出长度 = 输入长度 + 1
     * @default false
     */
    withChecksum?: boolean;
}

/**
 * 加密 ID 选项（用于验证和解密）
 */
export interface EncryptedIdOptions {
    /**
     * 前缀（可选）
     * @example 'doc', 'user', 'order'
     */
    prefix?: string;

    /**
     * 进制基数
     * @default 36
     */
    radix?: number;

    /**
     * 是否包含卢恩校验码
     * @default false
     */
    withChecksum?: boolean;

    /**
     * 加密密钥（必填）
     */
    encryptionKey?: string | Buffer;
}

/**
 * FF1 ID 生成选项（用于 formatForPublish）
 */
export interface FF1IdOptions extends FF1EncryptOptions {
    /**
     * 加密密钥（必填）
     */
    encryptionKey: string | Buffer;

    /**
     * 要加密的明文字符串（radix-36: 0-9, A-Z）
     * FF1 格式保留：输入几位，输出几位
     */
    plaintext: string;
}

/**
 * 加密 ID 验证结果
 */
export interface EncryptedIdValidationResult {
    /** 是否有效 */
    valid: boolean;
    /** 校验码是否正确 */
    checksumValid: boolean;
    /** 解密后的原始值（如果有效） */
    decrypted?: number;
}

// ==================== 规则引擎类型 ====================

/**
 * 文本适配执行结果。
 */
export interface AdaptResult {
    content: string;
    changed: boolean;
    appliedRuleNames: string[];
}

/**
 * 渲染结果。
 */
export interface RenderResult {
    content: string;
    format: "html" | "markdown";
    platform: string;
}

/**
 * 单文件处理结果。
 */
export interface AdaptedFileResult extends AdaptResult {
    inputPath: string;
    outputPath?: string;
}

/**
 * 目录批处理结果。
 */
export interface AdaptDirectoryResult {
    files: AdaptedFileResult[];
}

/**
 * 单文件校验结果。
 */
export interface ValidatedFileResult {
    inputPath: string;
    issues: ValidationIssue[];
}

/**
 * 目录校验结果。
 */
export interface ValidationSummary {
    files: ValidatedFileResult[];
    issueCount: number;
}

/**
 * 单文件渲染结果。
 */
export interface RenderedFileResult extends RenderResult {
    inputPath: string;
    outputPath?: string;
}

/**
 * 目录渲染结果。
 */
export interface RenderDirectoryResult {
    files: RenderedFileResult[];
}

/**
 * 单文件校验选项。
 */
export interface ValidateFileOptions {
    platform: string;
}

/**
 * 目录校验选项。
 */
export interface ValidateDirectoryOptions {
    platform: string;
}

/**
 * 单文件渲染选项。
 */
export interface RenderFileOptions {
    outFile?: string;
    dryRun?: boolean;
    platform: string;
}

/**
 * 目录渲染选项。
 */
export interface RenderDirectoryOptions {
    outDir?: string;
    dryRun?: boolean;
    platform: string;
}

// ==================== 图片处理类型 ====================

import type { UploadConfig } from "@cmtx/asset/upload";

/**
 * 图片处理选项
 */
export interface ProcessImagesOptions {
    /**
     * Step 1: 是否将 Markdown 图片转换为 HTML img 标签
     * @default false
     */
    convertToHtml?: boolean;

    /**
     * Step 2: HTML img width 属性
     * @example '480', '50%'
     */
    width?: string;

    /**
     * Step 2: HTML img height 属性
     * @example '320', 'auto'
     */
    height?: string;

    /**
     * Step 3: 上传配置（复用 asset 的 UploadConfig）
     * 如果提供，则执行上传步骤
     */
    upload?: UploadConfig;

    /**
     * 预览模式，不实际执行上传
     * @default false
     */
    dryRun?: boolean;
}

/**
 * 图片处理结果
 */
export interface ProcessImagesResult {
    /** 处理后的 Markdown 内容 */
    content: string;

    /** 处理统计信息 */
    stats: {
        /** Markdown → HTML 转换数量 */
        converted: number;

        /** HTML 图片尺寸调整数量 */
        resized: number;

        /** 上传图片数量 */
        uploaded: number;
    };
}

/**
 * 自动元数据选项
 */
export interface AutoMetadataOptions {
    /**
     * 是否自动生成 ID
     * 仅当 frontmatter 中无 id 时生成
     * @default false
     */
    generateId?: boolean;

    /**
     * FF1 ID 生成配置
     * encryptionKey 和 value 必填
     * 默认: 无前缀, length=6, withChecksum=true
     */
    idOptions?: FF1IdOptions;

    /**
     * 是否自动添加 date 字段
     * 仅当 frontmatter 中无 date 时添加
     * @default false
     */
    autoDate?: boolean;

    /**
     * 是否自动更新 updated 字段
     * 每次格式化时更新为当前日期
     * @default false
     */
    autoUpdated?: boolean;
}

/**
 * 发布格式化选项
 *
 * 在 ProcessImagesOptions 基础上增加 front matter 处理能力
 */
export interface FormatForPublishOptions {
    /**
     * Step 1: 是否将 Markdown 图片转换为 HTML img 标签
     * @default false
     */
    convertToHtml?: boolean;

    /**
     * Step 2: HTML img width 属性
     * @example '480', '50%'
     */
    width?: string;

    /**
     * Step 2: HTML img height 属性
     * @example '320', 'auto'
     */
    height?: string;

    /**
     * Step 3: 上传配置（复用 asset 的 UploadConfig）
     * 如果提供，则执行上传步骤
     */
    upload?: UploadConfig;

    /**
     * 预览模式，不实际执行上传
     * @default false
     */
    dryRun?: boolean;

    /**
     * Step 4: 是否将一级标题转换为 front matter 的 title 字段
     * @default false
     */
    convertTitle?: boolean;

    /**
     * Step 4: 要添加/更新的 front matter 字段
     * @example { date: '2026-04-05', tags: ['blog', 'tech'] }
     */
    frontmatter?: Record<string, string | string[]>;

    /**
     * Step 5: 自动元数据处理
     * 支持 ID、date、updated 字段的自动生成/更新
     */
    autoMetadata?: AutoMetadataOptions;
}

/**
 * 发布格式化结果
 */
export interface FormatForPublishResult {
    /** 处理后的 Markdown 内容 */
    content: string;

    /** 处理统计信息 */
    stats: {
        /** Markdown → HTML 转换数量 */
        converted: number;

        /** HTML 图片尺寸调整数量 */
        resized: number;

        /** 上传图片数量 */
        uploaded: number;

        /** 一级标题是否转换为 front matter title */
        titleConverted: boolean;

        /** front matter 是否更新 */
        frontmatterUpdated: boolean;

        /** ID 是否自动生成 */
        idGenerated: boolean;

        /** date 是否自动添加 */
        dateAdded: boolean;

        /** updated 是否自动更新 */
        updatedAdded: boolean;
    };
}
