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
  searchDir: string;
  adapter: string;
  bucket?: string;
  prefix?: string;
  naming?: import("@cmtx/upload").NamingStrategy;
  deleteStrategy?: import("@cmtx/upload").DeletionStrategy;
  dryRun?: boolean;
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
 * Config 命令选项
 */
export interface ConfigCommandOptions extends GlobalOptions {
  action: "init" | "show" | "set" | "get";
  key?: string;
  value?: string;
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
 * 日志函数
 */
export type Logger = (level: "debug" | "info" | "warn" | "error", message: string, meta?: unknown) => void;

/**
 * 格式化结果
 */
export interface FormattedResult {
  format: OutputFormat;
  content: string;
}
