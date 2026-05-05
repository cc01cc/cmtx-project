import { dirname } from "node:path";
import { createUploadService } from "@cmtx/asset";
import type { FileAccessor } from "@cmtx/asset/file";
import { FsFileAccessor } from "@cmtx/asset/file";
import { consoleLogger } from "@cmtx/core";
import type { ConflictResolutionStrategy } from "@cmtx/asset/upload";
import type { IStorageAdapter } from "@cmtx/storage";
import { createRuleEngineContext } from "../rule-context.js";
import type { RuleContext } from "../rules/rule-types.js";
import { createServiceRegistry } from "../rules/services/index.js";

export interface PublishReplaceConfig {
    adapter: IStorageAdapter;
    namingTemplate?: string;
    prefix?: string;
    conflictStrategy?: ConflictResolutionStrategy;
}

export interface PublishReplaceResult {
    modified: boolean;
    uploaded: number;
    messages: string[];
}

/**
 * 单文件：通过 rule engine 上传图片并替换文件中的引用。
 *
 * 内部创建 UploadService → RuleEngine → executeRule("upload-images") → 写回。
 * 使用可选的 FileAccessor（默认 FsFileAccessor）处理文件读写，
 * VSCode 环境传入 VSCodeFileAccessor 以感知未保存编辑器。
 */
export async function publishAndReplaceFile(
    filePath: string,
    config: PublishReplaceConfig,
    accessor?: FileAccessor,
): Promise<PublishReplaceResult> {
    const fileAccessor = accessor ?? new FsFileAccessor();
    const document = await fileAccessor.readText(filePath);
    const baseDir = dirname(filePath);

    const uploadService = createUploadService({
        adapter: config.adapter,
        namingTemplate: config.namingTemplate,
        prefix: config.prefix,
        conflictStrategy: config.conflictStrategy,
        logger: consoleLogger,
    });

    const registry = createServiceRegistry();
    registry.register(uploadService);

    const { engine } = createRuleEngineContext();

    const context: RuleContext = {
        document,
        filePath,
        baseDirectory: baseDir,
        services: registry,
    };

    const result = await engine.executeRule("upload-images", context, {
        upload: true,
        conflictStrategy: config.conflictStrategy,
    });

    if (result.modified) {
        await fileAccessor.writeText(filePath, result.content);
    }

    return { modified: result.modified, uploaded: 0, messages: result.messages ?? [] };
}

/**
 * 目录批量：通过 rule engine 上传目录内所有 md 文件的图片。
 *
 * 创建一次 UploadService + RuleEngine，逐文件复用。
 */
export async function publishAndReplaceDirectory(
    mdFiles: string[],
    config: PublishReplaceConfig,
    accessor?: FileAccessor,
): Promise<{ updatedFiles: string[]; totalUploaded: number; messages: string[] }> {
    const fileAccessor = accessor ?? new FsFileAccessor();
    const uploadService = createUploadService({
        adapter: config.adapter,
        namingTemplate: config.namingTemplate,
        prefix: config.prefix,
        conflictStrategy: config.conflictStrategy,
        logger: consoleLogger,
    });
    const registry = createServiceRegistry();
    registry.register(uploadService);
    const { engine } = createRuleEngineContext();

    const updatedFiles: string[] = [];
    const allMessages: string[] = [];
    for (const mdFile of mdFiles) {
        const document = await fileAccessor.readText(mdFile);
        const context: RuleContext = {
            document,
            filePath: mdFile,
            baseDirectory: dirname(mdFile),
            services: registry,
        };
        const result = await engine.executeRule("upload-images", context, {
            upload: true,
            conflictStrategy: config.conflictStrategy,
        });
        if (result.messages) {
            allMessages.push(...result.messages);
        }
        if (result.modified) {
            await fileAccessor.writeText(mdFile, result.content);
            updatedFiles.push(mdFile);
        }
    }
    return { updatedFiles, totalUploaded: 0, messages: allMessages };
}
