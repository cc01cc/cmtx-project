import { createHash } from 'node:crypto';
import { resolve as resolvePath } from 'node:path';
import type { ImageMatch, LoggerCallback } from '@cmtx/core';
import { filterImagesInText } from '@cmtx/core';
import type { IStorageAdapter } from '@cmtx/storage';
import {
    generateNameAndRemotePath,
    generateRemoteImageName,
    type NameTemplateVariables,
} from './naming-handler.js';
import {
    type DeleteStrategy,
    type DocumentAccessor,
    type ReplacementOp,
    SafeDeleteStrategy,
    StorageUploadStrategy,
    type UploadSource,
    type UploadStrategy,
} from './strategies.js';
import { createContext, renderTemplateImage } from './template-renderer.js';
import type {
    FailedItem,
    ImageCloudMapBody,
    ReplaceOptions,
    UploadConfig,
    UploadResult,
} from './types.js';
import { UploadContext } from './upload-context.js';

interface ImageMatchWithOffset {
    match: ImageMatch;
    startOffset: number;
    endOffset: number;
}

export interface UploadPipelineSelection {
    startOffset: number;
    endOffset: number;
}

export interface UploadPipelineInput {
    documentAccessor: DocumentAccessor;
    config: UploadConfig;
    uploadStrategy?: UploadStrategy;
    deleteStrategy?: DeleteStrategy;
    baseDirectory?: string;
    selection?: UploadPipelineSelection;
    selections?: UploadPipelineSelection[];
    shouldSkipSource?: (src: string) => boolean;
    createReplacementText?: (args: {
        image: ImageMatch;
        cloudResult: ImageCloudMapBody;
        replaceOptions: ReplaceOptions;
    }) => string;
    logger?: LoggerCallback;
    /**
     * 当文件已存在时的冲突处理回调
     * @param fileName - 文件名
     * @param remotePath - 远程路径
     * @param remoteUrl - 预期的远程 URL
     * @returns 'skip' | 'replace' | 'download' - 用户选择的操作
     */
    onFileExists?: (
        fileName: string,
        remotePath: string,
        remoteUrl: string
    ) => Promise<'skip' | 'replace' | 'download'>;
}

interface UploadProcessingState {
    context: UploadContext;
    failed: FailedItem[];
    replacementOps: ReplacementOp[];
    uploadedLocalPaths: Set<string>;
}

function computeImageOffsets(text: string, matches: ImageMatch[]): ImageMatchWithOffset[] {
    let cursor = 0;
    const withOffsets: ImageMatchWithOffset[] = [];

    for (const match of matches) {
        const startOffset = text.indexOf(match.raw, cursor);
        if (startOffset < 0) {
            continue;
        }

        const endOffset = startOffset + match.raw.length;
        cursor = startOffset + 1;

        withOffsets.push({
            match,
            startOffset,
            endOffset,
        });
    }

    return withOffsets;
}

function normalizePrefix(prefix?: string): string {
    if (!prefix) {
        return '';
    }
    return prefix.endsWith('/') ? prefix : `${prefix}/`;
}

function getBufferNameVariables(buffer: Buffer, ext: string): NameTemplateVariables {
    const now = new Date();
    const md5 = createHash('md5').update(buffer).digest('hex');

    return {
        name: md5.slice(0, 8),
        ext,
        fileName: `${md5.slice(0, 8)}${ext}`,
        date: now.toISOString().slice(0, 10),
        timestamp: Date.now().toString(),
        year: now.getFullYear().toString(),
        month: (now.getMonth() + 1).toString().padStart(2, '0'),
        day: now.getDate().toString().padStart(2, '0'),
        md5,
        md5_8: md5.slice(0, 8),
        md5_16: md5.slice(0, 16),
    };
}

function buildSourceForMatch(match: ImageMatch, baseDirectory: string): UploadSource | undefined {
    if (match.src.startsWith('data:image/')) {
        const dataUriRegex = /data:image\/([^;]+);base64,(.+)/;
        const base64Match = dataUriRegex.exec(match.src);
        if (!base64Match) {
            return undefined;
        }

        const ext = `.${base64Match[1]}`;
        return {
            kind: 'buffer',
            buffer: Buffer.from(base64Match[2], 'base64'),
            ext,
        };
    }

    const isRemote = /^https?:\/\//i.test(match.src);
    if (isRemote) {
        return undefined;
    }

    const absPath = resolvePath(baseDirectory, match.src);
    return {
        kind: 'file',
        absPath,
    };
}

async function buildRemoteInfoForSource(
    source: UploadSource,
    src: string,
    config: UploadConfig
): Promise<{
    name: string;
    remotePath: string;
    variables: NameTemplateVariables;
}> {
    if (source.kind === 'file') {
        const info = await generateNameAndRemotePath(
            {
                type: 'local',
                alt: '',
                src,
                absLocalPath: source.absPath,
                raw: '',
                syntax: 'md',
                source: 'file',
            },
            config.storage
        );

        return {
            name: info.name,
            remotePath: info.remotePath,
            variables: info.nameTemplateVariables,
        };
    }

    const namingTemplate = config.storage.namingTemplate ?? '{timestamp}{ext}';
    const variables = getBufferNameVariables(source.buffer, source.ext);
    const name = generateRemoteImageName(
        {
            fullPath: '',
            dirPath: '',
            fileName: variables.fileName,
            name: variables.name,
            ext: variables.ext,
            size: source.buffer.byteLength,
        },
        source.buffer,
        {
            ...config.storage,
            namingTemplate,
        }
    );

    return {
        name,
        remotePath: `${normalizePrefix(config.storage.prefix)}${name}`,
        variables,
    };
}

function createDefaultReplacementText(args: {
    image: ImageMatch;
    cloudResult: ImageCloudMapBody;
    replaceOptions: ReplaceOptions;
    imageFormat?: 'markdown' | 'html';
}): string {
    const { image, cloudResult, replaceOptions, imageFormat } = args;
    const renderContext = createContext(image.raw, {
        cloudUrl: cloudResult.url,
        cloudSrc: cloudResult.url,
        originalSrc: image.src,
        originalAlt: image.alt,
        originalTitle: image.title,
        ...cloudResult.nameTemplateVariables,
        ...replaceOptions.context,
    });

    // Render field templates
    const newSrc = replaceOptions.fields.src
        ? renderTemplateImage(replaceOptions.fields.src, renderContext)
        : cloudResult.url;
    const newAlt = replaceOptions.fields.alt
        ? renderTemplateImage(replaceOptions.fields.alt, renderContext)
        : image.alt;
    const newTitle = replaceOptions.fields.title
        ? renderTemplateImage(replaceOptions.fields.title, renderContext)
        : image.title;

    // Determine output format
    const outputFormat = imageFormat ?? image.syntax ?? 'markdown';

    // Generate replacement text based on format
    if (outputFormat === 'html') {
        // Build HTML img tag
        let htmlTag = `<img src="${newSrc}" alt="${newAlt}"`;
        if (newTitle) {
            htmlTag += ` title="${newTitle}"`;
        }
        // Preserve width and height if present in original HTML
        if (image.width) {
            htmlTag += ` width="${image.width}"`;
        }
        if (image.height) {
            htmlTag += ` height="${image.height}"`;
        }
        htmlTag += '>';
        return htmlTag;
    }

    // Markdown format
    if (newTitle) {
        return `![${newAlt}](${newSrc} "${newTitle}")`;
    }
    return `![${newAlt}](${newSrc})`;
}

function resolveSelectionRanges(input: UploadPipelineInput): UploadPipelineSelection[] | undefined {
    if (input.selections && input.selections.length > 0) {
        return input.selections;
    }

    if (input.selection) {
        return [input.selection];
    }

    return undefined;
}

function isInSelectionRanges(
    entry: ImageMatchWithOffset,
    ranges?: UploadPipelineSelection[]
): boolean {
    if (!ranges) {
        return true;
    }

    return ranges.some(
        (range) => entry.startOffset >= range.startOffset && entry.endOffset <= range.endOffset
    );
}

function getReplaceOptions(config: UploadConfig): ReplaceOptions {
    return (
        config.replace ?? {
            fields: { src: '{cloudSrc}' },
        }
    );
}

function createReplacementText(
    input: UploadPipelineInput,
    replaceOptions: ReplaceOptions,
    image: ImageMatch,
    cloudResult: ImageCloudMapBody
): string {
    if (input.createReplacementText) {
        return input.createReplacementText({
            image,
            cloudResult,
            replaceOptions,
        });
    }

    return createDefaultReplacementText({
        image,
        cloudResult,
        replaceOptions,
        imageFormat: input.config.imageFormat,
    });
}

function getDedupKey(source: UploadSource): string {
    if (source.kind === 'file') {
        return source.absPath;
    }

    return createHash('md5').update(source.buffer).digest('hex');
}

function pushReplacementOp(
    state: UploadProcessingState,
    entry: ImageMatchWithOffset,
    newText: string
): void {
    state.replacementOps.push({
        offset: entry.startOffset,
        length: entry.endOffset - entry.startOffset,
        newText,
    });
}

/**
 * 处理已缓存的上传结果
 */
function handleCachedResult(
    state: UploadProcessingState,
    entry: ImageMatchWithOffset,
    match: ImageMatch,
    cached: ImageCloudMapBody,
    input: UploadPipelineInput,
    replaceOptions: ReplaceOptions
): void {
    const newText = createReplacementText(input, replaceOptions, match, cached);
    pushReplacementOp(state, entry, newText);
}

/**
 * 检查文件是否已存在
 */
async function checkFileExists(adapter: IStorageAdapter, remotePath: string): Promise<boolean> {
    if (adapter.exists) {
        return await adapter.exists(remotePath);
    }
    return false;
}

/**
 * 处理单个图片匹配项
 */
async function processMatchEntry(args: {
    entry: ImageMatchWithOffset;
    input: UploadPipelineInput;
    state: UploadProcessingState;
    uploadStrategy: UploadStrategy;
    replaceOptions: ReplaceOptions;
    baseDirectory: string;
    log?: LoggerCallback;
}): Promise<void> {
    const { entry, input, state, uploadStrategy, replaceOptions, baseDirectory, log } = args;
    const match = entry.match;

    if (input.shouldSkipSource?.(match.src)) {
        return;
    }

    const source = buildSourceForMatch(match, baseDirectory);
    if (!source) {
        return;
    }

    const dedupKey = getDedupKey(source);
    const cached = state.context.getUploadResult(dedupKey);
    if (cached) {
        handleCachedResult(state, entry, match, cached, input, replaceOptions);
        return;
    }

    try {
        const remoteInfo = await buildRemoteInfoForSource(source, match.src, input.config);
        const adapter = input.config.storage.adapter;

        // Check if file already exists
        const fileExists = await checkFileExists(adapter, remoteInfo.remotePath);

        // Build URL
        const remoteUrl = adapter.buildUrl
            ? adapter.buildUrl(remoteInfo.remotePath)
            : `https://<storage-domain>/${remoteInfo.remotePath}`;

        let uploadResult: ImageCloudMapBody;

        if (fileExists) {
            log?.(
                'info',
                `[UploadPipeline] File already exists, skipping upload: ${remoteInfo.remotePath}`
            );

            if (input.onFileExists) {
                const action = await input.onFileExists(
                    remoteInfo.name,
                    remoteInfo.remotePath,
                    remoteUrl
                );

                if (action === 'skip') {
                    log?.('info', `[UploadPipeline] User chose to skip: ${remoteInfo.remotePath}`);
                    return;
                } else if (action === 'download') {
                    log?.(
                        'info',
                        `[UploadPipeline] User chose to download: ${remoteInfo.remotePath}`
                    );
                    return;
                }
                // action === 'replace' - continue with replacement
            }

            uploadResult = {
                name: remoteInfo.name,
                remotePath: remoteInfo.remotePath,
                url: remoteUrl,
                nameTemplateVariables: remoteInfo.variables,
            };
        } else {
            // Upload the file
            const upload = await uploadStrategy.upload(source, remoteInfo.remotePath, {
                contentType:
                    source.kind === 'buffer' ? `image/${source.ext.replace('.', '')}` : undefined,
            });

            uploadResult = {
                name: remoteInfo.name,
                remotePath: remoteInfo.remotePath,
                url: upload.url,
                nameTemplateVariables: remoteInfo.variables,
            };
        }

        // Record upload result
        state.context.recordUpload(dedupKey, uploadResult);

        const replacementText = createReplacementText(input, replaceOptions, match, uploadResult);
        pushReplacementOp(state, entry, replacementText);

        if (source.kind === 'file' && !fileExists) {
            state.uploadedLocalPaths.add(source.absPath);
        }
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        state.failed.push({
            localPath: source.kind === 'file' ? source.absPath : match.src,
            stage: 'upload',
            error: err.message,
        });
        log?.('error', `[UploadPipeline] Failed to upload: ${match.src}`, {
            error: err,
        });
    }
}

async function removeUploadedLocals(args: {
    deleteStrategy?: DeleteStrategy;
    uploadedLocalPaths: Set<string>;
    failed: FailedItem[];
}): Promise<number> {
    const { deleteStrategy, uploadedLocalPaths, failed } = args;
    if (!deleteStrategy || uploadedLocalPaths.size === 0) {
        return 0;
    }

    let deleted = 0;
    for (const absPath of uploadedLocalPaths) {
        try {
            const result = await deleteStrategy.remove(absPath);
            if (result.status === 'success') {
                deleted++;
            } else {
                failed.push({
                    localPath: absPath,
                    stage: 'delete',
                    error: result.error ?? 'delete failed',
                });
            }
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            failed.push({
                localPath: absPath,
                stage: 'delete',
                error: err.message,
            });
        }
    }

    return deleted;
}

export async function executeUploadPipeline(input: UploadPipelineInput): Promise<UploadResult> {
    const log = input.logger ?? input.config.events?.logger;
    const uploadStrategy =
        input.uploadStrategy ?? new StorageUploadStrategy(input.config.storage.adapter);

    // 检查是否启用删除
    const deleteEnabled = input.config.delete?.enabled !== false;
    const deleteStrategy =
        input.deleteStrategy ??
        (input.config.delete && deleteEnabled
            ? new SafeDeleteStrategy(input.config.delete)
            : undefined);
    const replaceOptions = getReplaceOptions(input.config);

    const documentText = await input.documentAccessor.readText();
    const allMatches = filterImagesInText(documentText);
    const selectionRanges = resolveSelectionRanges(input);
    const matches = computeImageOffsets(documentText, allMatches).filter((entry) =>
        isInSelectionRanges(entry, selectionRanges)
    );

    if (matches.length === 0) {
        log?.(
            'warn',
            `[UploadPipeline] No images found in selection. Selection ranges: ${JSON.stringify(selectionRanges)}, Total images in document: ${allMatches.length}`
        );
        return {
            success: true,
            uploaded: 0,
            replaced: 0,
            deleted: 0,
            content: documentText,
        };
    }

    const state: UploadProcessingState = {
        context: new UploadContext(),
        failed: [],
        replacementOps: [],
        uploadedLocalPaths: new Set<string>(),
    };
    const baseDirectory = input.baseDirectory ?? process.cwd();

    for (const entry of matches) {
        await processMatchEntry({
            entry,
            input,
            state,
            uploadStrategy,
            replaceOptions,
            baseDirectory,
            log,
        });
    }

    // 计算替换后的内容
    const sortedOps = [...state.replacementOps].sort((a, b) => b.offset - a.offset);
    let finalContent = documentText;
    for (const op of sortedOps) {
        const before = finalContent.slice(0, op.offset);
        const after = finalContent.slice(op.offset + op.length);
        finalContent = `${before}${op.newText}${after}`;
    }

    const applied = await input.documentAccessor.applyReplacements(state.replacementOps);

    const deleted = await removeUploadedLocals({
        deleteStrategy,
        uploadedLocalPaths: state.uploadedLocalPaths,
        failed: state.failed,
    });

    const result: UploadResult = {
        success: state.context.getCloudImageMap().size > 0 || matches.length === 0,
        uploaded: state.context.getCloudImageMap().size,
        replaced: applied ? state.replacementOps.length : 0,
        deleted,
        content: finalContent,
    };

    if (state.failed.length > 0) {
        result.failed = state.failed;
    }

    return result;
}
