/**
 * 替换服务 - 处理图片引用替换逻辑
 *
 * @module replace-service
 * @description
 * 负责 Markdown 文件中图片引用的替换处理。
 *
 * @remarks
 * ## 主要职责
 *
 * - 根据上传结果更新 Markdown 文件中的图片引用
 * - 支持同时替换 src、alt、title 多个字段
 * - 使用模板系统渲染新的字段值
 * - 集成 @cmtx/core 的替换功能
 *
 * ## 核心特性
 *
 * - **多字段替换**：一次性替换多个字段属性
 * - **模板渲染**：支持动态模板变量替换
 * - **精确匹配**：基于原始 src 值进行精准识别
 * - **批量处理**：构建替换操作数组统一执行
 *
 * ## 技术实现
 *
 * 1. 构建替换操作数组
 * 2. 为每个图片生成渲染上下文
 * 3. 使用模板引擎渲染新值
 * 4. 调用 core 的 replaceImagesInFile 执行替换
 *
 * @see {@link processFieldReplacements} - 主要导出函数
 * @see {@link buildReplaceOperations} - 替换操作构建函数
 * @see {@link renderTemplateImage} - 模板渲染函数
 */

import type {
    ReplaceOptions as CoreReplaceOptions,
    LocalImageMatchWithAbsPath,
    Logger,
} from "@cmtx/core";
import { renderTemplate } from "@cmtx/template";
import { FileService } from "../file/file-service.js";
import { createContext } from "./template-renderer.js";
import type { ImageCloudMapBody, ReplaceOptions } from "./types.js";

/**
 * 处理字段替换
 *
 * 流程：
 * 1. 为每个上传的图片构建替换操作
 * 2. 一次性执行所有替换
 * 3. 支持同时替换 src、alt、title
 *
 * @param markdownPath - Markdown 文件的绝对路径
 * @param uploadedImages - 上传成功的图片列表
 * @param replaceOptions - 替换配置
 * @param logger - 日志回调
 * @returns 替换统计 { replacedCount, filesModified }
 */
export async function processFieldReplacements(
    markdownPath: string,
    uploadedImages: {
        imageMatch: LocalImageMatchWithAbsPath;
        cloudResult: ImageCloudMapBody;
    }[],
    replaceOptions: ReplaceOptions,
    logger?: Logger,
): Promise<{ replacedCount: number; filesModified: number }> {
    logger?.debug(`[ReplaceService] Processing ${uploadedImages.length} uploaded images`);

    if (uploadedImages.length === 0) {
        return { replacedCount: 0, filesModified: 0 };
    }

    const fileService = new FileService();

    try {
        // 为每个图片构建替换操作，一次性替换多个字段
        const operations = buildReplaceOperations(uploadedImages, replaceOptions);

        if (operations.length === 0) {
            logger?.info("[ReplaceService] No replacement operations needed");
            return { replacedCount: 0, filesModified: 0 };
        }

        // 一次性执行所有替换
        const result = await fileService.replaceImagesInFile(markdownPath, operations);
        const changes = result.result?.replacements.length || 0;

        if (changes > 0) {
            logger?.info(`[ReplaceService] Total replacements: ${changes}`);
        }

        return { replacedCount: changes, filesModified: changes > 0 ? 1 : 0 };
    } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger?.error("[ReplaceService] Error processing replacements", {
            error,
        });
        return { replacedCount: 0, filesModified: 0 };
    }
}

/**
 * 构建替换操作数组
 *
 * 为每个上传的图片创建一个替换操作，支持同时替换 src、alt、title
 */
function buildReplaceOperations(
    uploadedImages: Array<{
        imageMatch: LocalImageMatchWithAbsPath;
        cloudResult: ImageCloudMapBody;
    }>,
    replaceOptions: ReplaceOptions,
): CoreReplaceOptions[] {
    const operations: CoreReplaceOptions[] = [];

    for (const { imageMatch, cloudResult } of uploadedImages) {
        // 构建渲染上下文
        const renderContext = createContext(imageMatch.raw, {
            cloudUrl: cloudResult.url,
            cloudSrc: cloudResult.url,
            originalSrc: imageMatch.src,
            originalAlt: imageMatch.alt,
            originalTitle: imageMatch.title,
            ...cloudResult.nameTemplateVariables,
            ...replaceOptions.context,
        });

        // 渲染每个字段的新值
        const newSrc = replaceOptions.fields.src
            ? renderTemplate(replaceOptions.fields.src, renderContext, {
                  emptyString: "preserve",
              })
            : undefined;
        const newAlt = replaceOptions.fields.alt
            ? renderTemplate(replaceOptions.fields.alt, renderContext, {
                  emptyString: "preserve",
              })
            : undefined;
        const newTitle = replaceOptions.fields.title
            ? renderTemplate(replaceOptions.fields.title, renderContext, {
                  emptyString: "preserve",
              })
            : undefined;

        // 使用 src 作为标识符，一次性替换多个字段
        operations.push({
            field: "src",
            pattern: imageMatch.src,
            newSrc,
            newAlt,
            newTitle,
        });
    }

    return operations;
}
