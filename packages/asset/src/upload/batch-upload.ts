import { createHash } from "node:crypto";
import type { ImageMatch, Logger } from "@cmtx/core";
import type { IStorageAdapter } from "@cmtx/storage";
import { renderTemplate } from "@cmtx/template";
import { createContext } from "./template-renderer.js";
import { generateNameAndRemotePath } from "./naming-handler.js";
import { type ReplacementOp, type UploadSource, StorageUploadStrategy } from "./strategies.js";
import type { ReplaceConfig } from "./types.js";

export type BatchConflictStrategy = { type: "skip-all" } | { type: "replace-all" };

export interface BatchUploadConfig {
    adapter: IStorageAdapter;
    namingTemplate?: string;
    prefix?: string;
    conflictStrategy?: BatchConflictStrategy;
    logger?: Logger;
}

export interface BatchUploadResultItem {
    cloudUrl: string;
    remotePath: string;
    name: string;
    variables: Record<string, string>;
    action: "uploaded" | "skipped" | "replaced";
}

export interface BatchUploadResult {
    lookup(source: UploadSource): BatchUploadResultItem | undefined;
    uploaded: BatchUploadResultItem[];
    skipped: BatchUploadResultItem[];
    failed: { source: UploadSource; error: string }[];
}

/**
 * 渲染替换文本 — 将上传后的云端 URL 渲染为 markdown/HTML 图片语法。
 * 从 pipeline.ts 的 createDefaultReplacementText 提取。
 */
export function renderReplacementText(
    image: ImageMatch,
    cloudResult: { cloudUrl: string; variables: Record<string, string> },
    replaceOptions?: { fields: Record<string, string>; context?: Record<string, string> },
    imageFormat?: "markdown" | "html",
): string {
    const rctx = createContext(image.raw, {
        cloudUrl: cloudResult.cloudUrl,
        cloudSrc: cloudResult.cloudUrl,
        originalSrc: image.src,
        originalAlt: image.alt,
        originalTitle: image.title,
        ...cloudResult.variables,
        ...replaceOptions?.context,
    });

    const fields = replaceOptions?.fields ?? { src: "{cloudSrc}" };
    const newSrc = fields.src
        ? renderTemplate(fields.src, rctx, { emptyString: "preserve" })
        : cloudResult.cloudUrl;
    const newAlt = fields.alt
        ? renderTemplate(fields.alt, rctx, { emptyString: "preserve" })
        : image.alt;
    const newTitle = fields.title
        ? renderTemplate(fields.title, rctx, { emptyString: "preserve" })
        : image.title;

    const fmt = imageFormat ?? image.syntax ?? "markdown";
    if (fmt === "html") {
        let tag = `<img src="${newSrc}" alt="${newAlt}"`;
        if (newTitle) tag += ` title="${newTitle}"`;
        if (image.width) tag += ` width="${image.width}"`;
        if (image.height) tag += ` height="${image.height}"`;
        tag += ">";
        return tag;
    }
    return newTitle ? `![${newAlt}](${newSrc} "${newTitle}")` : `![${newAlt}](${newSrc})`;
}

/**
 * 按偏移量从后向前应用替换操作。
 * 纯函数，不修改传入的数组。
 */
export function applyReplacementOps(documentText: string, ops: ReplacementOp[]): string {
    const sortedOps = [...ops].sort((a, b) => b.offset - a.offset);
    let content = documentText;
    for (const op of sortedOps) {
        const before = content.slice(0, op.offset);
        const after = content.slice(op.offset + op.length);
        content = `${before}${op.newText}${after}`;
    }
    return content;
}

function getDedupKey(source: UploadSource): string {
    if (source.kind === "file") {
        return source.absPath;
    }
    return createHash("md5").update(source.buffer).digest("hex");
}

async function checkFileExists(adapter: IStorageAdapter, remotePath: string): Promise<boolean> {
    if (adapter.exists) {
        return await adapter.exists(remotePath);
    }
    return false;
}

/**
 * 上传单张图片到云端。
 * 内部函数，被 batchUploadImages 和 pipeline.ts 的 processMatchEntry 共用。
 * @internal 非公开导出
 */
export async function uploadSingleImage(
    source: UploadSource,
    src: string,
    namingConfig: { adapter: IStorageAdapter; namingTemplate?: string },
    prefix: string,
    conflictStrategy?: BatchConflictStrategy,
    logger?: Logger,
): Promise<BatchUploadResultItem> {
    const remoteInfo = await generateNameAndRemotePath(
        {
            type: "local",
            match: { type: "local", alt: "", src, raw: "", syntax: "md" },
            filePath: "",
            absPath: source.kind === "file" ? source.absPath : "",
        },
        namingConfig,
        prefix,
        logger,
    );

    const adapter = namingConfig.adapter;
    const fileExists = await checkFileExists(adapter, remoteInfo.remotePath);
    const remoteUrl = adapter.buildUrl
        ? adapter.buildUrl(remoteInfo.remotePath)
        : `https://<storage-domain>/${remoteInfo.remotePath}`;

    if (fileExists) {
        if (conflictStrategy?.type === "replace-all") {
            const strategy = new StorageUploadStrategy(adapter);
            const upload = await strategy.upload(source, remoteInfo.remotePath);
            logger?.info(`[Upload] Replaced: ${remoteInfo.remotePath}`);
            return {
                name: remoteInfo.name,
                remotePath: remoteInfo.remotePath,
                cloudUrl: upload.url,
                variables: remoteInfo.nameTemplateVariables,
                action: "replaced",
            };
        }
        logger?.info(`[Upload] File already exists, skipping: ${remoteInfo.remotePath}`);
        return {
            name: remoteInfo.name,
            remotePath: remoteInfo.remotePath,
            cloudUrl: remoteUrl,
            variables: remoteInfo.nameTemplateVariables,
            action: "skipped",
        };
    }

    const strategy = new StorageUploadStrategy(adapter);
    const upload = await strategy.upload(source, remoteInfo.remotePath, {
        contentType: source.kind === "buffer" ? `image/${source.ext.replace(".", "")}` : undefined,
    });

    logger?.info(`[Upload] Uploaded: ${remoteInfo.remotePath}`);
    return {
        name: remoteInfo.name,
        remotePath: remoteInfo.remotePath,
        cloudUrl: upload.url,
        variables: remoteInfo.nameTemplateVariables,
        action: "uploaded",
    };
}

export async function batchUploadImages(
    sources: UploadSource[],
    config: BatchUploadConfig,
): Promise<BatchUploadResult> {
    const results = new Map<string, BatchUploadResultItem>();
    const failedItems: BatchUploadResult["failed"] = [];

    for (const source of sources) {
        const dedupKey = getDedupKey(source);
        if (results.has(dedupKey)) {
            continue;
        }

        try {
            const src = source.kind === "file" ? source.absPath : "";
            const result = await uploadSingleImage(
                source,
                src,
                { adapter: config.adapter, namingTemplate: config.namingTemplate },
                config.prefix ?? "",
                config.conflictStrategy,
                config.logger,
            );
            results.set(dedupKey, result);
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            config.logger?.error(`[BatchUpload] Failed to upload: ${err.message}`);
            failedItems.push({ source, error: err.message });
        }
    }

    return {
        lookup: (source: UploadSource) => results.get(getDedupKey(source)),
        uploaded: [...results.values()].filter((r) => r.action !== "skipped"),
        skipped: [...results.values()].filter((r) => r.action === "skipped"),
        failed: failedItems,
    };
}
