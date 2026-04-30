/**
 * CLI 特定的类型定义
 */

/**
 * 通用 CLI 选项
 */
export interface GlobalOptions {
    projectRoot?: string;
    verbose?: boolean;
    quiet?: boolean;
    config?: string;
    output?: OutputFormat;
}

/**
 * 输出格式
 */
export type OutputFormat = "json" | "table" | "plain";

/**
 * Analyze 命令选项
 */
export interface AnalyzeCommandOptions extends GlobalOptions {
    searchDir: string;
    depth?: number;
    extensions?: string;
    maxSize?: number;
}

/**
 * Upload 命令选项
 */
export interface UploadCommandOptions extends GlobalOptions {
    filePath: string;
    provider?: "aliyun-oss" | "tencent-cos";
    prefix?: string;
    namingPattern?: string; // CLI 选项 --naming-pattern 转换为 namingPattern
    enableDelete?: boolean;
    deleteStrategy?: "trash" | "move" | "hard-delete";
    trashDir?: string;
}

/**
 * Find 命令选项
 */
export interface FindCommandOptions extends GlobalOptions {
    imagePath: string;
    searchDir?: string;
}

/**
 * Delete 命令选项
 */
export interface DeleteCommandOptions extends GlobalOptions {
    imagePath: string;
    strategy?: string;
    force?: boolean;
    moveDir?: string;
}

/**
 * Copy 命令选项
 */
export interface CopyCommandOptions extends GlobalOptions {
    filePath: string;
    config?: string;
    provider?: "aliyun-oss" | "tencent-cos";
    dryRun: boolean;
    concurrency: number;
    verbose: boolean;
    // 阿里云凭证
    sourceAccessKeyId?: string;
    sourceAccessKeySecret?: string;
    // 腾讯云凭证
    sourceSecretId?: string;
    sourceSecretKey?: string;
    // 通用
    sourceRegion?: string;
    sourceBucket?: string;
    // 阿里云凭证
    targetAccessKeyId?: string;
    targetAccessKeySecret?: string;
    // 腾讯云凭证
    targetSecretId?: string;
    targetSecretKey?: string;
    // 通用
    targetRegion?: string;
    targetBucket?: string;
    targetDomain?: string;
    prefix?: string;
    namingTemplate?: string;
    overwrite: boolean;
    tempDir?: string;
    quiet: boolean;
    format: "json" | "table" | "plain";
    /** 删除源文件（move 命令使用） */
    deleteSource?: boolean;
}

/**
 * Move 命令选项
 */
export interface MoveCommandOptions extends CopyCommandOptions {
    /** 保留源文件（等同于 copy） */
    keepSource?: boolean;
    /** 删除源文件（默认 true） */
    deleteSource?: boolean;
}

/**
 * Config 命令选项
 */
export interface ConfigCommandOptions extends GlobalOptions {
    action: "init" | "list" | "show";
    preset?: string;
    outputFile?: string;
    force?: boolean;
}

/**
 * Format 命令选项
 */
export interface FormatCommandOptions extends Omit<GlobalOptions, "output"> {
    filePath: string;
    to: "markdown" | "html";
    output?: string;
    width?: string;
    height?: string;
    inPlace?: boolean;
    dryRun?: boolean;
    verbose?: boolean;
}

/**
 * 配置文件结构
 */
export interface CmtxConfig {
    projectRoot?: string;
    defaultAdapter?: string;
    adapters?: Record<string, Record<string, unknown>>;
    uploadPrefix?: string;
    namingStrategy?: string;
    deleteStrategy?: string;
    searchDepth?: number;
    allowedExtensions?: string[];
    maxFileSize?: number;
    trashDir?: string;
}

/**
 * adapt 命令选项
 */
export interface AdaptCommandOptions extends GlobalOptions {
    input: string;
    ruleFile?: string;
    platform?: string;
    check?: boolean;
    render?: "html";
    out?: string;
    outDir?: string;
    dryRun: boolean;
    verbose: boolean;
}

/**
 * 格式化结果
 */
export interface FormattedResult {
    format: OutputFormat;
    content: string;
}
