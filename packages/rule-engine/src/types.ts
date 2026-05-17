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
