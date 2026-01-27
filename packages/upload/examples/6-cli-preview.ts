/**
 * @cmtx/upload - 核心上传逻辑
 *
 * 提供图片上传和 Markdown 引用替换的核心功能
 */

import { createHash } from "node:crypto";
import { stat, mkdir } from "node:fs/promises";
import {
  resolve,
  isAbsolute,
  extname,
  relative,
  dirname,
  basename,
  join,
} from "node:path";
import {
  extractImagesFromDirectory,
  getImageReferenceDetails,
  replaceImageInFiles,
  type ReplaceFileResult,
} from "@cmtx/core";

import type {
  UploadOptions,
  AnalyzeOptions,
  UploadAnalysis,
  UploadResult,
  ImageInfo,
  SkippedImageInfo,
  UploadEvent,
  FilterOptions,
  NamingOptions,
  DeletionStrategy,
} from "./types.js";

/**
 * 默认配置
 */
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_ALLOWED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".svg",
  ".webp",
];
const DEFAULT_TRASH_DIR = ".cmtx-trash/";
const DEFAULT_MAX_DELETION_RETRIES = 3;

/**
 * 动态导入 trash 库（避免 ESM 导入问题）
 */
async function getTrash(): Promise<
  (input: string | readonly string[]) => Promise<void>
> {
  const trashModule = await import("trash");
  return trashModule.default as (
    input: string | readonly string[],
  ) => Promise<void>;
}

/**
 * 计算文件内容的 MD5 哈希值（前 8 位）
 *
 * @public
 *
 * @param filePath - 文件的绝对路径
 * @returns MD5 哈希值的前 8 位字符
 *
 * @throws {Error} 当文件不存在或无法读取时抛出错误
 *
 * @remarks
 * **性能警告**：此函数需要读取完整的文件内容进行哈希计算。
 * 对于大文件（如视频、高分辨率图片）可能耗时较长。
 * 建议仅在必要时调用此函数。
 *
 * @example
 * ```typescript
 * const hash = await computeFileHash("/path/to/image.png");
 * console.log(hash); // "a1b2c3d4"
 * ```
 */
export async function computeFileHash(filePath: string): Promise<string> {
  const { readFile } = await import("node:fs/promises");
  const content = await readFile(filePath);
  return createHash("md5").update(content).digest("hex").slice(0, 8);
}

/**
 * 格式化时间戳为 YYYYMMDD-HHmmss-SSS
 *
 * @public
 *
 * @param date - 日期对象，默认为当前时间
 * @returns 格式化后的时间戳字符串
 *
 * @example
 * ```typescript
 * const timestamp = formatTimestamp();
 * console.log(timestamp); // "20260126-143025-123"
 *
 * const customDate = new Date("2026-01-01T00:00:00.000Z");
 * const customTimestamp = formatTimestamp(customDate);
 * console.log(customTimestamp); // "20260101-000000-000"
 * ```
 */
export function formatTimestamp(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const milliseconds = String(date.getMilliseconds()).padStart(3, "0");

  return `${year}${month}${day}-${hours}${minutes}${seconds}-${milliseconds}`;
}

/**
 * 生成带时间戳和内容哈希的文件名
 *
 * @public
 *
 * @param localPath - 本地文件路径
 * @returns 格式：原名-YYYYMMDD-HHmmss-SSS-{MD5 前 8 位}.ext
 *
 * @throws {Error} 当文件不存在或无法读取时抛出错误
 *
 * @remarks
 * 此函数会计算文件哈希值，对大文件可能较慢。
 *
 * @example
 * ```typescript
 * // logo.png -> logo-20260126-143045-123-a1b2c3d4.png
 * const newName = await generateRenamedFilename("/path/to/logo.png");
 * console.log(newName); // "logo-20260126-143045-123-a1b2c3d4.png"
 * ```
 */
export async function generateRenamedFilename(localPath: string): Promise<string> {
  const ext = extname(localPath);
  const nameWithoutExt = basename(localPath, ext);
  const timestamp = formatTimestamp();
  const hash = await computeFileHash(localPath);

  return `${nameWithoutExt}-${timestamp}-${hash}${ext}`;
}

/**
 * 应用命名策略生成远程路径
 *
 * @public
 *
 * @param options - 命名选项，包含 localPath、uploadPrefix 和 namingStrategy
 * @returns 远程路径（不含域名）
 *
 * @throws {Error} 当文件不存在、策略未实现或自定义函数失败时抛出错误
 *
 * @remarks
 * 支持的预定义策略：
 * - `"original+timestamp+hash"`: 原名-YYYYMMDD-HHmmss-SSS-{MD5 前 8 位}.ext（默认）
 * - `"hash-only"`: 仅使用哈希值（未实现）
 * - `"timestamp-only"`: 仅使用时间戳（未实现）
 * - `"uuid"`: 使用 UUID（未实现）
 *
 * 也可以传入自定义函数进行灵活命名。
 *
 * @example
 * ```typescript
 * // 使用默认策略
 * const remotePath = await applyNamingStrategy({
 *   localPath: "/path/to/logo.png",
 *   uploadPrefix: "images/blog"
 * });
 * console.log(remotePath); // "images/blog/logo-20260126-143045-123-a1b2c3d4.png"
 *
 * // 使用自定义策略
 * const customPath = await applyNamingStrategy({
 *   localPath: "/path/to/logo.png",
 *   uploadPrefix: "assets",
 *   namingStrategy: (path) => `custom-${Date.now()}${extname(path)}`
 * });
 * console.log(customPath); // "assets/custom-1706265845123.png"
 * ```
 */
export async function applyNamingStrategy(
  options: NamingOptions,
): Promise<string> {
  const {
    localPath,
    uploadPrefix = "",
    namingStrategy = "original+timestamp+hash",
  } = options;

  let filename: string;

  if (typeof namingStrategy === "function") {
    filename = await namingStrategy(localPath);
  } else if (namingStrategy === "original+timestamp+hash") {
    // 默认策略：原名 + 时间戳 + 哈希
    filename = await generateRenamedFilename(localPath);
  } else if (namingStrategy === "hash-only") {
    throw new Error("Strategy 'hash-only' is not implemented yet");
  } else if (namingStrategy === "timestamp-only") {
    throw new Error("Strategy 'timestamp-only' is not implemented yet");
  } else if (namingStrategy === "uuid") {
    throw new Error("Strategy 'uuid' is not implemented yet");
  } else {
    throw new Error(`Unknown naming strategy: ${namingStrategy}`);
  }

  return uploadPrefix ? `${uploadPrefix}/${filename}` : filename;
}

/**
 * 删除/回收本地文件
 *
 * @param localPath - 本地文件路径
 * @param deletionStrategy - 删除策略
 * @param trashDir - 回收目录（当策略为 "move" 时使用）
 * @param projectRoot - 项目根目录
 * @param maxRetries - 最大重试次数
 * @returns 删除结果
 */
async function deleteLocalFile(
  localPath: string,
  deletionStrategy: DeletionStrategy,
  trashDir: string,
  projectRoot: string,
  maxRetries: number,
): Promise<{
  status: "success" | "failed" | "skipped";
  retries: number;
  error?: string;
}> {
  if (deletionStrategy === "trash") {
    // 尝试使用系统回收站
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const trash = await getTrash();
        await trash(localPath);
        return { status: "success", retries: attempt };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // 如果是最后一次尝试，退化到 move 策略
        if (attempt === maxRetries) {
          try {
            return await deleteLocalFile(
              localPath,
              "move",
              trashDir,
              projectRoot,
              0,
            );
          } catch (moveError) {
            return {
              status: "failed",
              retries: attempt,
              error: `Trash failed: ${lastError.message}; Move fallback failed: ${moveError instanceof Error ? moveError.message : String(moveError)}`,
            };
          }
        }

        // 等待后重试
        await new Promise((resolve) =>
          setTimeout(resolve, 100 * Math.pow(2, attempt)),
        );
      }
    }

    return {
      status: "failed",
      retries: maxRetries,
      error: lastError?.message || "Unknown error",
    };
  } else if (deletionStrategy === "move") {
    // 移动到指定目录
    const { readFile, writeFile, unlink } = await import("node:fs/promises");
    const trashDirAbs = isAbsolute(trashDir)
      ? trashDir
      : resolve(projectRoot, trashDir);

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // 确保回收目录存在
        await mkdir(trashDirAbs, { recursive: true });

        // 生成目标路径（保留原始文件名）
        const filename = basename(localPath);
        const targetPath = join(trashDirAbs, filename);

        // 移动文件（读取后写入再删除，避免跨文件系统问题）
        const content = await readFile(localPath);
        await writeFile(targetPath, content);
        await unlink(localPath);

        return { status: "success", retries: attempt };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries) {
          await new Promise((resolve) =>
            setTimeout(resolve, 100 * Math.pow(2, attempt)),
          );
        }
      }
    }

    return {
      status: "failed",
      retries: maxRetries,
      error: lastError?.message || "Unknown error",
    };
  } else if (deletionStrategy === "hard-delete") {
    // 永久删除
    const { unlink } = await import("node:fs/promises");
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await unlink(localPath);
        return { status: "success", retries: attempt };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries) {
          await new Promise((resolve) =>
            setTimeout(resolve, 100 * Math.pow(2, attempt)),
          );
        }
      }
    }

    return {
      status: "failed",
      retries: maxRetries,
      error: lastError?.message || "Unknown error",
    };
  }

  return { status: "skipped", retries: 0 };
}

/**
 * 验证并规范化路径
 */
function resolvePath(basePath: string, targetPath: string): string {
  const absolutePath = isAbsolute(targetPath)
    ? targetPath
    : resolve(basePath, targetPath);

  // 安全检查：确保路径在 basePath 内
  const relPath = relative(basePath, absolutePath);
  if (relPath.startsWith("..") || isAbsolute(relPath)) {
    throw new Error(`Path must be within project root: ${targetPath}`);
  }

  return absolutePath;
}

/**
 * 触发事件（如果有回调）
 */
function emitEvent(
  options: AnalyzeOptions | UploadOptions,
  type: UploadEvent["type"],
  data?: UploadEvent["data"],
): void {
  if (!options.onEvent) return;

  options.onEvent({
    type,
    timestamp: Date.now(),
    data,
  });
}

/**
 * 检查文件是否符合上传条件
 */
async function shouldUploadFile(
  filePath: string,
  options: FilterOptions,
): Promise<{
  valid: boolean;
  reason?: string;
  fileSize?: number;
  extension?: string;
}> {
  // 检查扩展名
  const ext = extname(filePath).toLowerCase();
  const allowedExts = options.allowedExtensions || DEFAULT_ALLOWED_EXTENSIONS;
  if (!allowedExts.includes(ext)) {
    return {
      valid: false,
      reason: `Extension ${ext} not allowed`,
      extension: ext,
    };
  }

  // 检查文件大小
  try {
    const stats = await stat(filePath);
    const fileSize = stats.size;
    const maxSize = options.maxFileSize || DEFAULT_MAX_FILE_SIZE;

    if (fileSize > maxSize) {
      return {
        valid: false,
        reason: `File size ${fileSize} exceeds limit ${maxSize}`,
        fileSize,
        extension: ext,
      };
    }

    return { valid: true, fileSize, extension: ext };
  } catch (error) {
    return {
      valid: false,
      reason: `Cannot access file: ${error instanceof Error ? error.message : String(error)}`,
      extension: ext,
    };
  }
}

/**
 * 解析图片的绝对路径（基于 Markdown 文件位置）
 */
function resolveImagePath(
  imageSrc: string,
  markdownFilePath: string,
  _projectRoot: string,
): string {
  // 如果已经是绝对路径
  if (isAbsolute(imageSrc)) {
    return imageSrc;
  }

  // 相对于 Markdown 文件解析
  const markdownDir = dirname(markdownFilePath);
  return resolve(markdownDir, imageSrc);
}

/**
 * 将 UploadOptions 转换为 AnalyzeOptions（上传内部调用分析时使用）
 */
function toAnalyzeOptions(uploadOpts: UploadOptions): AnalyzeOptions {
  return {
    projectRoot: uploadOpts.projectRoot,
    searchDir: uploadOpts.searchDir,
    maxFileSize: uploadOpts.maxFileSize,
    allowedExtensions: uploadOpts.allowedExtensions,
    onEvent: uploadOpts.onEvent,
    logger: uploadOpts.logger,
  };
}

/**
 * 分析待上传的图片
 *
 * @remarks
 * 扫描目录并分析所有本地图片的引用情况。
 * **不会执行上传**，仅用于预览待处理资源。
 *
 * @param options - 分析选项配置（不需要 adapter）
 * @returns 分析结果，包含图片列表、跳过列表、总大小等
 *
 * @throws {Error} 当路径无效或无权限时抛出错误
 *
 * @example
 * ```typescript
 * const analysis = await analyzeImages({
 *   projectRoot: "/path/to/project",
 *   searchDir: "docs",
 *   maxFileSize: 10 * 1024 * 1024,  // 10MB
 *   allowedExtensions: [".png", ".jpg"]
 * });
 *
 * console.log(`找到 ${analysis.totalCount} 个图片`);
 * console.log(`跳过 ${analysis.skipped.length} 个图片`);
 * analysis.images.forEach(img => {
 *   console.log(`${img.localPath} - ${img.fileSize} bytes`);
 * });
 * analysis.skipped.forEach(skip => {
 *   console.log(`跳过：${skip.localPath} - ${skip.reason}`);
 * });
 * ```
 */
export async function analyzeImages(
  options: AnalyzeOptions,
): Promise<UploadAnalysis> {
  const {
    projectRoot,
    searchDir,
    logger,
    localPrefixes = ["*"],
    uploadPrefix,
    namingStrategy,
    deletionStrategy,
  } = options;

  // 路径解析和验证
  const projectRootAbs = resolve(projectRoot);
  const searchDirAbs = resolvePath(projectRootAbs, searchDir);

  emitEvent(options, "scan:start");

  // 扫描所有图片（默认匹配所有本地图片）
  const extractResult = await extractImagesFromDirectory(searchDirAbs, {
    projectRoot: projectRootAbs,
    localPrefixes,
    logger,
  });

  // 收集所有图片（extractResult 是 DirectoryScanResult 数组）
  const allImages: Array<{ imageSrc: string; markdownPath: string }> = [];
  for (const result of extractResult) {
    for (const img of result.images) {
      if (img.sourceType === "local") {
        allImages.push({
          imageSrc: img.src,
          markdownPath: result.absolutePath,
        });
      }
    }
  }

  logger?.("info", `Found ${allImages.length} local images`);

  // 收集图片信息与跳过信息
  const imageInfoMap = new Map<string, ImageInfo>();
  const skipped: SkippedImageInfo[] = [];

  for (const img of allImages) {
    // 解析图片的绝对路径
    const imageAbsPath = resolveImagePath(
      img.imageSrc,
      img.markdownPath,
      projectRootAbs,
    );

    if (imageInfoMap.has(imageAbsPath)) {
      // 添加引用
      const info = imageInfoMap.get(imageAbsPath)!;
      const relPath = relative(searchDirAbs, img.markdownPath);
      if (!info.referencedIn.includes(relPath)) {
        info.referencedIn.push(relPath);
      }
    } else {
      // 检查文件是否符合条件
      const check = await shouldUploadFile(imageAbsPath, options);

      if (!check.valid) {
        logger?.("warn", `Skip file: ${imageAbsPath}`, {
          reason: check.reason,
        });
        skipped.push({
          localPath: imageAbsPath,
          reason: check.reason!,
          fileSize: check.fileSize,
          extension: check.extension,
        });
        continue;
      }

      // 构建 ImageInfo
      const imageInfo: ImageInfo = {
        localPath: imageAbsPath,
        fileSize: check.fileSize!,
        referencedIn: [relative(searchDirAbs, img.markdownPath)],
      };

      // 条件性生成预览信息
      if (namingStrategy) {
        try {
          imageInfo.previewRemotePath = await applyNamingStrategy({
            localPath: imageAbsPath,
            uploadPrefix,
            namingStrategy,
          });
        } catch (error) {
          logger?.("warn", `Failed to generate preview path for: ${imageAbsPath}`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      if (deletionStrategy) {
        imageInfo.previewDeletionStrategy = deletionStrategy;
      }

      imageInfoMap.set(imageAbsPath, imageInfo);
    }
  }

  const images = Array.from(imageInfoMap.values());
  const totalSize = images.reduce((sum, img) => sum + img.fileSize, 0);

  emitEvent(options, "scan:complete", {
    scannedCount: images.length,
  });

  return {
    images,
    skipped,
    totalSize,
    totalCount: images.length,
  };
}

/**
 * 上传单个图片到 OSS
 *
 * @remarks
 * 上传指定的本地图片文件到对象存储，并替换所有引用该图片的 Markdown 文件。
 *
 * @param localPath - 本地图片文件的路径（支持相对路径或绝对路径）
 * @param options - 上传选项配置
 * @param preGeneratedRemotePath - 预生成的远程路径（可选，用于批量上传时复用）
 * @returns 上传结果，包含 OSS URL 和替换详情
 *
 * @throws {Error} 当文件不存在、不符合条件或上传失败时抛出错误
 *
 * @example
 * ```typescript
 * const result = await uploadImage("docs/images/logo.png", {
 *   projectRoot: "/path/to/project",
 *   searchDir: "docs",
 *   adapter: myAdapter,
 *   uploadPrefix: "blog/images"
 * });
 *
 * console.log(`Uploaded to: ${result.ossUrl}`);
 * console.log(`Replaced in ${result.replaceResults.length} files`);
 * ```
 */
export async function uploadImage(
  localPath: string,
  options: UploadOptions,
  preGeneratedRemotePath?: string,
): Promise<UploadResult> {
  const {
    projectRoot,
    searchDir,
    adapter,
    uploadPrefix = "",
    namingStrategy = "original+timestamp+hash",
    deletionStrategy = "trash",
    trashDir = DEFAULT_TRASH_DIR,
    maxDeletionRetries = DEFAULT_MAX_DELETION_RETRIES,
    logger,
  } = options;

  // 路径解析和验证
  const projectRootAbs = resolve(projectRoot);
  const searchDirAbs = resolvePath(projectRootAbs, searchDir);
  const localPathAbs = resolvePath(projectRootAbs, localPath);

  // 检查文件是否符合条件
  const check = await shouldUploadFile(localPathAbs, options);
  if (!check.valid) {
    throw new Error(`File cannot be uploaded: ${check.reason}`);
  }

  const fileSize = check.fileSize!;

  // 获取引用详情
  const refDetails = await getImageReferenceDetails(
    localPathAbs,
    searchDirAbs,
    {
      projectRoot: projectRootAbs,
      logger,
    },
  );

  if (refDetails.length === 0) {
    logger?.("warn", `No references found for image: ${localPathAbs}`);
    throw new Error(`No Markdown files reference this image: ${localPathAbs}`);
  }

  // 生成远程路径（使用预生成的或即时生成）
  const originalName = basename(localPathAbs);
  const remotePath =
    preGeneratedRemotePath ||
    (await applyNamingStrategy({
      localPath: localPathAbs,
      uploadPrefix,
      namingStrategy,
    }));

  emitEvent(options, "upload:start", {
    localPath: localPathAbs,
    fileSize,
    originalName,
    renamedTo: remotePath,
  });

  let ossUrl: string;
  const startTime = Date.now();

  // 实际上传
  try {
    ossUrl = await adapter.upload(localPathAbs, remotePath);

    logger?.("info", `Uploaded successfully: ${ossUrl}`, {
      localPath: localPathAbs,
      remotePath,
      originalName,
    });
  } catch (error) {
    emitEvent(options, "upload:error", {
      localPath: localPathAbs,
      error: error instanceof Error ? error : new Error(String(error)),
    });
    throw error;
  }

  const uploadTime = Date.now() - startTime;

  emitEvent(options, "upload:complete", {
    localPath: localPathAbs,
    ossUrl,
    fileSize,
    remotePath,
  });

  // 替换 Markdown 引用
  emitEvent(options, "replace:start", {
    localPath: localPathAbs,
    ossUrl,
  });

  let replaceResults: ReplaceFileResult[] = [];

  try {
    replaceResults = await replaceImageInFiles(localPathAbs, searchDirAbs, {
      projectRoot: projectRootAbs,
      newSrc: ossUrl,
      logger,
    });

    logger?.("info", `Replaced in ${replaceResults.length} files`);
  } catch (error) {
    emitEvent(options, "replace:error", {
      localPath: localPathAbs,
      error: error instanceof Error ? error : new Error(String(error)),
    });
    throw error;
  }

  emitEvent(options, "replace:complete", {
    localPath: localPathAbs,
    replacedCount: replaceResults.length,
  });

  // 删除/回收本地文件
  let deletionStatus: "success" | "failed" | "skipped" = "skipped";
  let deletionRetries = 0;
  let deletionError: string | undefined;

  if (
    deletionStrategy === "trash" ||
    deletionStrategy === "move" ||
    deletionStrategy === "hard-delete"
  ) {
    // 实际删除/回收
    emitEvent(options, "delete:start", {
      localPath: localPathAbs,
    });

    const deleteResult = await deleteLocalFile(
      localPathAbs,
      deletionStrategy,
      trashDir,
      projectRootAbs,
      maxDeletionRetries,
    );

    deletionStatus = deleteResult.status;
    deletionRetries = deleteResult.retries;
    deletionError = deleteResult.error;

    if (deletionStatus === "success") {
      logger?.("info", `Deleted/recycled successfully: ${localPathAbs}`, {
        strategy: deletionStrategy,
        retries: deletionRetries,
      });

      emitEvent(options, "delete:complete", {
        localPath: localPathAbs,
        deletionStatus,
        deletionRetries,
      });
    } else {
      logger?.("warn", `Failed to delete/recycle: ${localPathAbs}`, {
        strategy: deletionStrategy,
        retries: deletionRetries,
        error: deletionError,
      });

      emitEvent(options, "delete:error", {
        localPath: localPathAbs,
        deletionStatus,
        deletionRetries,
        error: new Error(deletionError || "Unknown deletion error"),
      });
    }
  }

  return {
    localPath: localPathAbs,
    ossUrl,
    fileSize,
    uploadTime,
    replaceResults,
    originalName,
    remotePath,
    deletionStatus,
    deletionRetries,
    deletionError,
  };
}

/**
 * 上传并替换所有本地图片
 *
 * @remarks
 * 扫描指定目录下的所有 Markdown 文件，找出本地图片引用，
 * 逐个上传到对象存储，并替换为远程 URL。
 *
 * 上传为串行执行（非并发），确保可控性和可追踪性。
 * 支持 dry-run 模式预览。
 *
 * @param options - 上传选项配置
 * @returns 所有图片的上传结果数组
 *
 * @throws {Error} 当路径无效或无权限时抛出错误（单个文件失败不会中断流程）
 *
 * @example
 * ```typescript
 * const results = await uploadAndReplace({
 *   projectRoot: "/path/to/project",
 *   searchDir: "docs",
 *   adapter: myAdapter,
 *   uploadPrefix: "blog/images",
 *   onEvent: (event) => {
 *     console.log(`[${event.type}] ${JSON.stringify(event.data)}`);
 *   }
 * });
 *
 * console.log(`Successfully uploaded ${results.length} images`);
 * ```
 */
export async function uploadAndReplace(
  options: UploadOptions,
): Promise<UploadResult[]> {
  const {
    logger,
    uploadPrefix = "",
    namingStrategy = "original+timestamp+hash",
  } = options;

  // 1. 分析待上传图片
  const analysis = await analyzeImages(toAnalyzeOptions(options));

  if (analysis.totalCount === 0) {
    logger?.("info", "No local images found to upload");
    return [];
  }

  logger?.("info", `Found ${analysis.totalCount} images to upload`, {
    totalSize: analysis.totalSize,
  });

  // 2. 预生成所有图片的远程路径（确保同一图片使用相同名称）
  const remotePathMap = new Map<string, string>();
  for (const imageInfo of analysis.images) {
    const remotePath = await applyNamingStrategy({
      localPath: imageInfo.localPath,
      uploadPrefix,
      namingStrategy,
    });
    remotePathMap.set(imageInfo.localPath, remotePath);
  }

  logger?.("info", "Pre-generated remote paths for all images");

  // 3. 串行上传每个图片
  const results: UploadResult[] = [];
  let uploadedCount = 0;
  let failedCount = 0;

  for (const imageInfo of analysis.images) {
    try {
      const preGeneratedPath = remotePathMap.get(imageInfo.localPath);
      const result = await uploadImage(
        imageInfo.localPath,
        options,
        preGeneratedPath,
      );
      results.push(result);
      uploadedCount++;

      logger?.("info", `Progress: ${uploadedCount}/${analysis.totalCount}`, {
        uploaded: uploadedCount,
        failed: failedCount,
      });
    } catch (error) {
      failedCount++;
      logger?.("error", `Failed to upload: ${imageInfo.localPath}`, {
        error: error instanceof Error ? error.message : String(error),
      });

      // 继续处理其他文件（不中断流程）
    }
  }

  emitEvent(options, "complete", {
    uploadedCount,
    scannedCount: analysis.totalCount,
  });

  logger?.(
    "info",
    `Upload complete: ${uploadedCount} succeeded, ${failedCount} failed`,
  );

  return results;
}
