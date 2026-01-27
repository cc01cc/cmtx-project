/**
 * 图片分析和扫描
 *
 * 扫描本地图片、验证、收集元信息
 */

import { stat } from "node:fs/promises";
import { resolve, relative } from "node:path";
import {
  extractImagesFromDirectory,
} from "@cmtx/core";
import type {
  AnalyzeOptions,
  UploadMultiImagesOptions,
  UploadAnalysis,
  ImageInfo,
  SkippedImageInfo,
  ImageFilterOptions,
} from "../types.js";
import { emitEvent, resolvePath, resolveImagePath } from "../utils/index.js";
import { applyNamingStrategy } from "./naming.js";

const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_ALLOWED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".svg",
  ".webp",
];

/**
 * 检查文件是否符合上传条件
 */
async function shouldUploadFile(
  filePath: string,
  options: ImageFilterOptions,
): Promise<{
  valid: boolean;
  reason?: string;
  fileSize?: number;
  extension?: string;
}> {
  const { extname } = await import("node:path");
  const ext = extname(filePath).toLowerCase();
  const allowedExts = options.allowedExtensions || DEFAULT_ALLOWED_EXTENSIONS;

  if (!allowedExts.includes(ext)) {
    return {
      valid: false,
      reason: `Extension ${ext} not allowed`,
      extension: ext,
    };
  }

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
 * 将 UploadMultiImagesOptions 转换为 AnalyzeOptions
 */
export function toAnalyzeOptions(uploadOpts: UploadMultiImagesOptions): AnalyzeOptions {
  return {
    workspace: uploadOpts.workspace,
    maxFileSize: uploadOpts.maxFileSize,
    allowedExtensions: uploadOpts.allowedExtensions,
    localPrefixes: uploadOpts.localPrefixes,
    naming: uploadOpts.naming,
    deletion: uploadOpts.deletion
      ? { strategy: uploadOpts.deletion.strategy }
      : undefined,
    hooks: uploadOpts.hooks,
  };
}

/**
 * 分析待上传的图片
 */
export async function analyzeImages(
  options: AnalyzeOptions,
): Promise<UploadAnalysis> {
  const {
    workspace,
    hooks,
    naming,
    deletion,
    localPrefixes = ["*"],
  } = options;

  const projectRootAbs = resolve(workspace.projectRoot);
  const searchDirAbs = resolvePath(projectRootAbs, workspace.searchDir);
  const logger = hooks?.logger;
  const uploadPrefix = naming?.uploadPrefix;
  const namingStrategy = naming?.namingStrategy;
  const deletionStrategy = deletion?.strategy;

  emitEvent(options, "scan:start");

  const extractResult = await extractImagesFromDirectory(searchDirAbs, {
    projectRoot: projectRootAbs,
    localPrefixes,
    logger,
  });

  // 收集所有图片
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

  const imageInfoMap = new Map<string, ImageInfo>();
  const skipped: SkippedImageInfo[] = [];

  for (const img of allImages) {
    const imageAbsPath = resolveImagePath(
      img.imageSrc,
      img.markdownPath,
      projectRootAbs,
    );

    if (imageInfoMap.has(imageAbsPath)) {
      const info = imageInfoMap.get(imageAbsPath)!;
      const relPath = relative(searchDirAbs, img.markdownPath);
      if (!info.referencedIn.includes(relPath)) {
        info.referencedIn.push(relPath);
      }
    } else {
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

      const imageInfo: ImageInfo = {
        localPath: imageAbsPath,
        fileSize: check.fileSize!,
        referencedIn: [relative(searchDirAbs, img.markdownPath)],
      };

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
