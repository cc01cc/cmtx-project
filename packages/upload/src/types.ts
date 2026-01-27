/**
 * @cmtx/upload - 类型定义
 *
 * 提供 Markdown 图片上传到对象存储（如阿里云 OSS）的功能
 */

import type { ReplaceFileResult, LoggerCallback } from "@cmtx/core";

/**
 * 上传事件类型
 */
export type UploadEventType =
  | "scan:start" // 开始扫描图片
  | "scan:complete" // 扫描完成
  | "upload:start" // 单个图片开始上传
  | "upload:complete" // 单个图片上传完成
  | "upload:error" // 单个图片上传失败
  | "replace:start" // 开始替换 markdown 引用
  | "replace:complete" // 替换完成
  | "replace:error" // 替换失败
  | "delete:start" // 开始删除/回收本地文件
  | "delete:complete" // 删除/回收完成
  | "delete:error" // 删除/回收失败
  | "complete"; // 整个流程完成

/**
 * 上传事件数据
 */
export interface UploadEvent {
  /** 事件类型 */
  type: UploadEventType;

  /** 事件时间戳（毫秒） */
  timestamp: number;

  /** 事件相关数据 */
  data?: {
    /** 本地图片路径 */
    localPath?: string;

    /** 远程路径（不含域名） */
    remotePath?: string;

    /** 原始文件名 */
    originalName?: string;

    /** 重命名后的文件名 */
    renamedTo?: string;

    /** 完整的 CDN URL */
    ossUrl?: string;

    /** 文件大小（字节） */
    fileSize?: number;

    /** 已扫描的图片数量 */
    scannedCount?: number;

    /** 已上传的图片数量 */
    uploadedCount?: number;

    /** 已替换的文件数量 */
    replacedCount?: number;

    /** 已删除/回收的图片数量 */
    deletedCount?: number;

    /** 删除/回收状态 */
    deletionStatus?: "success" | "failed" | "skipped";

    /** 删除/回收重试次数 */
    deletionRetries?: number;

    /** 错误信息 */
    error?: Error;
  };
}

/**
 * 事件回调函数
 */
export type UploadEventCallback = (event: UploadEvent) => void;

/**
 * 图片过滤选项
 */
export interface ImageFilterOptions {
  /** 文件大小限制（字节），默认 10MB */
  maxFileSize?: number;

  /** 允许的文件扩展名白名单，默认 ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'] */
  allowedExtensions?: string[];
}

/**
 * 工作区路径配置
 */
export interface WorkspaceOptions {
  /** 项目根目录（必填） */
  projectRoot: string;

  /** 扫描/查找 Markdown 的目录（必填） */
  searchDir: string;
}

/**
 * 事件与日志回调配置
 */
export interface HookOptions {
  /** 上传流程事件回调 */
  onEvent?: UploadEventCallback;

  /** 透传给 @cmtx/core 的日志回调 */
  logger?: LoggerCallback;
}

/**
 * 命名配置
 */
export interface NamingConfig {
  /** OSS 路径前缀，不以 / 结尾 */
  uploadPrefix?: string;

  /** 文件命名策略，默认 "original+timestamp+hash" */
  namingStrategy?: NamingStrategy;
}

/**
 * 删除配置
 */
export interface DeletionOptions {
  /** 删除策略（默认 trash） */
  strategy?: DeletionStrategy;

  /** 当 strategy 为 move 时的目标目录，默认 .cmtx-trash/ */
  trashDir?: string;

  /** 删除失败时的最大重试次数，默认 3 */
  maxRetries?: number;
}

/**
 * 命名模板上下文接口
 * 定义所有可用的模板令牌及其类型
 *
 * @remarks
 * 用于 `resolveNamingTemplate()` 函数生成文件名时的上下文数据
 */
export interface NamingTemplateContext {
  // 文件基础信息
  original: string;           // 原始文件名（不含扩展名）
  ext: string;                // 扩展名（含点，如 .png）
  fullname: string;           // 完整原始文件名

  // MD5 哈希 - 统一下划线
  md5_8: string;              // MD5 前 8 位
  md5_16: string;             // MD5 前 16 位
  md5_32: string;             // 完整 MD5 (32位)
  md5: string;                // MD5 完整版（别名，同 md5_32）

  // SHA256 哈希 - 统一下划线
  sha256_8: string;           // SHA256 前 8 位
  sha256_16: string;          // SHA256 前 16 位
  sha256_32: string;          // SHA256 前 32 位
  sha256_64: string;          // 完整 SHA256 (64位)
  sha256: string;             // SHA256 完整版（别名，同 sha256_64）

  // 时间戳相关 - 保持一致
  timestamp: number;          // 毫秒级时间戳数字
  timestamp_sec: number;      // 秒级时间戳
  date: string;               // YYYYMMDD
  time: string;               // HHmmss
  datetime: string;           // YYYYMMDDHHmmss
  iso_date: string;           // ISO 8601 (2026-01-26)

  // 文件属性 - 保持一致
  size: number;               // 文件大小（字节）
  size_kb: number;            // 文件大小（KB）
  size_mb: number;            // 文件大小（MB）

  // 随机值 - 保持一致
  uuid: string;               // UUID v4
  random: string;             // 8位随机十六进制字符串
}

/**
 * 命名策略类型
 *
 * @remarks
 * 支持三种方式：
 * 
 * 1. **预定义别名**（向后兼容）：
 *    - "original+timestamp+hash": 原名_{datetime}_{md5_8}.ext（默认）
 *    - "hash-only": {md5_8}.ext
 *    - "timestamp-only": {timestamp}.ext
 *    - "uuid": {uuid}.ext
 * 
 * 2. **模板字符串**（推荐）：
 *    - {original}: 原始文件名（不含扩展名）
 *    - {ext}: 扩展名（含点）
 *    - {md5_8}, {md5_16}, {md5_32}, {md5}: MD5 哈希
 *    - {sha256_8}, {sha256_16}, {sha256_32}, {sha256_64}, {sha256}: SHA256 哈希
 *    - {timestamp}, {timestamp_sec}, {date}, {time}, {datetime}, {iso_date}: 时间戳
 *    - {size}, {size_kb}, {size_mb}: 文件大小
 *    - {uuid}, {random}: 随机值
 * 
 * 3. **自定义函数**：
 *    (localPath: string) => string | Promise<string>，返回新的文件名（不含路径）
 *
 * @example
 * ```typescript
 * // 预定义别名
 * "original+timestamp+hash"
 * 
 * // 模板字符串
 * "{original}_{md5_8}_{datetime}{ext}"
 * "{date}/{time}_{md5_16}{ext}"
 * "{sha256_8}{ext}"
 * 
 * // 自定义函数
 * (path) => \`custom-\${Date.now()}\${extname(path)}\`
 * ```
 */
export type NamingStrategy =
  | "original+timestamp+hash"
  | "hash-only"
  | "timestamp-only"
  | "uuid"
  | ((localPath: string) => string | Promise<string>)
  | (string & { readonly __brand?: never });

/**
 * 命名策略选项
 *
 * @remarks
 * 用于配置图片文件的命名规则
 */
export interface NamingOptions {
  /** 本地文件路径 */
  localPath: string;

  /** 上传路径前缀（可选） */
  uploadPrefix?: string;

  /** 命名策略（可选），默认 "original+timestamp+hash" */
  namingStrategy?: NamingStrategy;
}

/**
 * 删除策略类型
 *
 * @remarks
 * - "trash": 使用系统回收站（跨平台，推荐）（默认）
 * - "move": 移动到指定目录（由 trashDir 指定）
 * - "hard-delete": 永久删除（谨慎使用）
 */
export type DeletionStrategy = "trash" | "move" | "hard-delete";

/**
 * 核心上传配置（单图片和多图片上传的共享配置）
 */
export interface CoreUploadConfig {
  /** 工作区路径配置 */
  workspace: WorkspaceOptions;

  /** 存储适配器（必填） */
  adapter: IStorageAdapter;

  /** 命名配置 */
  naming?: NamingConfig;

  /** 删除配置 */
  deletion?: DeletionOptions;

  /** 是否替换 Markdown 文件中的图片引用（默认 false） */
  replace?: boolean;

  /** 事件与日志回调 */
  hooks?: HookOptions;
}


/**
 * 存储适配器接口
 *
 * @remarks
 * 实现此接口以支持不同的云存储服务（阿里云 OSS、AWS S3、腾讯云 COS 等）
 *
 * @example
 * ```typescript
 * class AliOSSAdapter implements IStorageAdapter {
 *   constructor(private client: OSS) {}
 *
 *   async upload(localPath: string, remotePath: string): Promise<string> {
 *     const result = await this.client.put(remotePath, localPath);
 *     return result.url;
 *   }
 * }
 * ```
 */
export interface IStorageAdapter {
  /**
   * 上传文件到远程存储
   *
   * @param localPath - 本地文件的绝对路径
   * @param remotePath - 远程路径（不含域名），如 "images/2024/logo.png"
   * @returns 完整的 CDN URL
   * @throws {Error} 上传失败时抛出错误
   */
  upload(localPath: string, remotePath: string): Promise<string>;
}

/**
 * 分析选项配置（不需要 adapter）
 */
export interface AnalyzeOptions {
  /** 工作区路径配置 */
  workspace: WorkspaceOptions;

  /** 本地图片前缀匹配规则（默认 ["*"]） */
  localPrefixes?: string[];

  /** 命名配置（用于预览路径生成） */
  naming?: NamingConfig;

  /** 删除策略预览 */
  deletion?: Pick<DeletionOptions, "strategy">;

  /** 事件与日志回调 */
  hooks?: HookOptions;

  /** 文件大小限制（字节），默认 10MB */
  maxFileSize?: number;

  /** 允许的文件扩展名白名单，默认 ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'] */
  allowedExtensions?: string[];
}

/**
 * 单图片上传选项（不包含过滤选项）
 * 
 * @remarks
 * 用于 uploadSingleImage 函数，因为已经指定了具体文件，
 * 不需要 maxFileSize、allowedExtensions、localPrefixes 等过滤选项
 */
export type UploadSingleImageOptions = CoreUploadConfig;

/**
 * 多图片批量上传选项（包含过滤选项）
 */
export interface UploadMultiImagesOptions extends CoreUploadConfig {
  /** 本地图片前缀匹配规则（默认 ["*"]） */
  localPrefixes?: string[];

  /** 文件大小限制（字节），默认 10MB */
  maxFileSize?: number;

  /** 允许的文件扩展名白名单，默认 ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'] */
  allowedExtensions?: string[];
}

/**
 * 单个图片的上传结果
 */
export interface UploadResult {
  /** 本地图片的绝对路径 */
  localPath: string;

  /** 上传后的完整 CDN URL */
  ossUrl: string;

  /** 文件大小（字节） */
  fileSize: number;

  /** 上传耗时（毫秒） */
  uploadTime: number;

  /** 是否执行了 Markdown 引用替换 */
  replaced: boolean;

  /** Markdown 文件替换结果（当 replaced 为 true 时有效） */
  replaceResults: ReplaceFileResult[];

  /** 原始文件名 */
  originalName: string;

  /** 重命名后的远程路径（不含域名） */
  remotePath: string;

  /** 删除/回收状态 */
  deletionStatus?: "success" | "failed" | "skipped";

  /** 删除/回收重试次数 */
  deletionRetries?: number;

  /** 删除/回收失败原因 */
  deletionError?: string;
}

/**
 * 图片信息（用于分析）
 */
export interface ImageInfo {
  /** 本地图片的绝对路径 */
  localPath: string;

  /** 文件大小（字节） */
  fileSize: number;

  /** 引用此图片的 Markdown 文件相对路径列表 */
  referencedIn: string[];

  /** 预览的远程路径（不含域名），仅当 AnalyzeOptions 提供 namingStrategy 时生成 */
  previewRemotePath?: string;

  /** 预览的删除策略，仅当 AnalyzeOptions 提供 deletionStrategy 时填充 */
  previewDeletionStrategy?: DeletionStrategy;
}

/**
 * 被跳过的图片信息
 */
export interface SkippedImageInfo {
  /** 本地图片的绝对路径 */
  localPath: string;

  /** 跳过原因 */
  reason: string;

  /** 文件大小（字节），如果可获取 */
  fileSize?: number;

  /** 文件扩展名 */
  extension?: string;
}

/**
 * 上传分析结果
 */
export interface UploadAnalysis {
  /** 待上传的图片列表 */
  images: ImageInfo[];

  /** 被跳过的图片列表 */
  skipped: SkippedImageInfo[];

  /** 总文件大小（字节） */
  totalSize: number;

  /** 图片总数 */
  totalCount: number;
}
