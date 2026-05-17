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
    region?: string;
    bucket?: string;
    conflictStrategy?: "skip" | "overwrite";
}

/**
 * Find 命令选项
 */
export interface FindCommandOptions extends GlobalOptions {
    imagePath: string;
    searchDir?: string;
}

/**
 * Download 命令选项
 */
export interface DownloadCommandOptions extends GlobalOptions {
    input: string;
    outputDir: string;
    domain?: string;
    namingTemplate?: string;
    concurrency?: number;
    overwrite?: boolean;
    "dry-run"?: boolean;
}

/**
 * Delete 命令选项
 */
export interface DeleteCommandOptions extends GlobalOptions {
    imagePath: string[];
    strategy?: string;
    force?: boolean;
    removeReferences?: boolean;
    moveDir?: string;
    dryRun?: boolean;
    yes?: boolean;
}

/**
 * Prune 命令选项
 */
export interface PruneCommandOptions extends GlobalOptions {
    searchDir?: string;
    strategy?: string;
    moveDir?: string;
    dryRun?: boolean;
    force?: boolean;
    yes?: boolean;
}

/**
 * Presign 命令选项
 */
export interface PresignCommandOptions extends GlobalOptions {
    input?: string;
    url?: string;
    expires?: number;
    provider?: "aliyun-oss" | "tencent-cos";
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
    // verbose/quiet 继承自 GlobalOptions

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
    // output 继承自 GlobalOptions（OutputFormat 类型）
    /** 删除源文件（move 命令使用） */
    deleteSource?: boolean;
    /** 输出格式 (json|table|plain) */
    format: OutputFormat;
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
 *
 * 使用 Omit<GlobalOptions, "output"> 避免 output 属性与 OutputFormat 类型冲突。
 */
export interface FormatCommandOptions extends Omit<GlobalOptions, "output"> {
    filePath: string;
    to: "markdown" | "html";
    outputPath?: string;
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
 * publish 命令选项
 */
export interface PublishCommandOptions extends GlobalOptions {
    input: string;
    preset?: string;
    toDir?: string;
    dryRun: boolean;
    verbose: boolean;
    force: boolean;
}

/**
 * Section Numbers Add 命令选项
 */
export interface SectionNumbersAddOptions extends Omit<GlobalOptions, "output"> {
    filePath: string;
    minLevel?: number;
    maxLevel?: number;
    startLevel?: number;
    separator?: string;
    outputPath?: string;
    inPlace?: boolean;
    dryRun?: boolean;
    verbose?: boolean;
}

/**
 * Section Numbers Remove 命令选项
 */
export interface SectionNumbersRemoveOptions extends Omit<GlobalOptions, "output"> {
    filePath: string;
    minLevel?: number;
    maxLevel?: number;
    outputPath?: string;
    inPlace?: boolean;
    dryRun?: boolean;
    verbose?: boolean;
}

/**
 * 格式化结果
 */
export interface FormattedResult {
    format: OutputFormat;
    content: string;
}
