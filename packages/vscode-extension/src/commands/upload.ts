import { dirname, resolve as resolvePath } from 'node:path';
import {
    ConfigBuilder,
    type DocumentAccessor,
    executeUploadPipeline,
    generateNameAndRemotePath,
    type ReplacementOp,
} from '@cmtx/asset/upload';
import type { ImageMatch } from '@cmtx/core';
import { filterImagesInText, isWebSource } from '@cmtx/core';
import type { AliyunCredentials, IStorageAdapter, TencentCredentials } from '@cmtx/storage';
import { createAdapter } from '@cmtx/storage/adapters/factory';
import * as vscode from 'vscode';
import { getLogger, getUploadConfig, showError, showInfo } from '../infra';
import {
    type ConflictFile,
    type DownloadResult,
    downloadRemoteFiles,
    showConflictResolutionDialog,
} from './conflict-dialog';

/**
 * 上传总超时时间：5 分钟
 */
const UPLOAD_TIMEOUT = 5 * 60 * 1000;

/**
 * Flag to prevent concurrent uploads
 */
let isUploading = false;

/**
 * VS Code Document Accessor - Reads from editor's current content (including unsaved changes)
 * instead of the disk file. This ensures selection offsets match the actual content being edited.
 */
class VsCodeDocumentAccessor implements DocumentAccessor {
    constructor(private readonly editor: vscode.TextEditor) {}

    get identifier(): string {
        return this.editor.document.uri.fsPath;
    }

    async readText(): Promise<string> {
        // Read from editor's current content (including unsaved changes)
        return this.editor.document.getText();
    }

    async applyReplacements(ops: ReplacementOp[]): Promise<boolean> {
        if (ops.length === 0) {
            return false;
        }

        // Sort operations by offset in descending order to avoid position shifts
        const sortedOps = [...ops].sort((a, b) => b.offset - a.offset);

        // Apply edits using VS Code API
        const success = await this.editor.edit((editBuilder) => {
            for (const op of sortedOps) {
                const startPos = this.editor.document.positionAt(op.offset);
                const endPos = this.editor.document.positionAt(op.offset + op.length);
                const range = new vscode.Range(startPos, endPos);
                editBuilder.replace(range, op.newText);
            }
        });

        return success;
    }
}

/**
 * Scan for file conflicts before uploading
 */
async function scanConflicts(
    images: ImageMatch[],
    baseDirectory: string,
    prefix: string,
    namingTemplate: string | undefined,
    adapter: IStorageAdapter
): Promise<ConflictFile[]> {
    const conflicts: ConflictFile[] = [];

    // Skip if adapter doesn't support exists check
    if (!adapter.exists) {
        return conflicts;
    }

    for (const image of images) {
        // Skip web sources
        if (isWebSource(image.src)) {
            continue;
        }

        try {
            // Use generateNameAndRemotePath from @cmtx/asset to calculate remote path
            const { name, remotePath } = await generateNameAndRemotePath(
                {
                    type: 'local',
                    src: image.src,
                    absLocalPath: resolvePath(baseDirectory, image.src),
                    raw: image.raw,
                    syntax: image.syntax,
                    alt: image.alt,
                    source: 'file',
                },
                {
                    adapter,
                    prefix,
                    namingTemplate,
                }
            );

            // Check if file exists in remote storage
            const exists = await adapter.exists(remotePath);

            if (exists) {
                const remoteUrl = adapter.buildUrl
                    ? adapter.buildUrl(remotePath)
                    : `https://<storage-domain>/${remotePath}`;
                conflicts.push({
                    fileName: name,
                    remotePath,
                    localPath: resolvePath(baseDirectory, image.src),
                    remoteUrl,
                });
            }
        } catch (error) {
            // Log error but continue scanning other files
            const logger = getLogger('upload');
            logger.warn(`Failed to scan conflict for ${image.src}:`, error);
        }
    }

    return conflicts;
}

export async function uploadAllImages(): Promise<void> {
    // Prevent concurrent uploads
    if (isUploading) {
        showInfo('上传正在进行中，请稍候...');
        return;
    }

    isUploading = true;

    try {
        await doUploadAllImages();
    } finally {
        isUploading = false;
    }
}

async function doUploadAllImages(): Promise<void> {
    const logger = getLogger('upload');
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'markdown') {
        showError('Please open a Markdown file first');
        return;
    }

    const filePath = editor.document.uri.fsPath;
    const config = await getUploadConfig();

    if (!config.providerConfig.bucket || !config.providerConfig.region) {
        showError('Please configure cloud storage settings first');
        return;
    }

    try {
        const credentials = buildCredentials(config.providerConfig);

        if (!credentials) {
            throw new Error('Missing cloud storage credentials');
        }

        const adapter = await createAdapter(credentials);

        const uploadConfig = new ConfigBuilder()
            .storage(adapter, {
                prefix: config.providerConfig.path,
                namingTemplate: config.namingTemplate,
            })
            .replace({
                fields: {
                    src: '{cloudSrc}',
                    alt: '{originalAlt}',
                },
            })
            .build();

        // Pass imageFormat config
        uploadConfig.imageFormat = config.imageFormat;

        const result = await executeUploadPipeline({
            documentAccessor: new VsCodeDocumentAccessor(editor),
            config: uploadConfig,
            baseDirectory: dirname(filePath),
        });

        // Show simple notification (auto-dismiss)
        showInfo(`上传完成: ${result.uploaded} 个上传, ${result.replaced} 个替换`);
        logger.info(`Upload result: ${JSON.stringify(result)}`);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        showError(`上传失败: ${message}`);
        logger.error('Upload failed:', error);
    }
}

export async function uploadSelectedImages(): Promise<void> {
    // Prevent concurrent uploads
    if (isUploading) {
        showInfo('上传正在进行中，请稍候...');
        return;
    }

    isUploading = true;

    // Set up timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
            reject(new Error('上传超时，请检查网络连接后重试'));
        }, UPLOAD_TIMEOUT);
    });

    try {
        await Promise.race([doUploadSelectedImages(), timeoutPromise]);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        showError(`上传失败: ${message}`);
    } finally {
        isUploading = false;
    }
}

async function doUploadSelectedImages(): Promise<void> {
    const logger = getLogger('upload');
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'markdown') {
        showError('Please open a Markdown file first');
        return;
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
        showError('Please select text containing images');
        return;
    }

    const selectedText = editor.document.getText(selection);
    if (!selectedText.trim()) {
        showError('Selected text is empty');
        return;
    }

    // Validate: Check if selection contains local images
    const imagesInSelection = filterImagesInText(selectedText);
    const localImages = imagesInSelection.filter((img) => !isWebSource(img.src));

    if (localImages.length === 0) {
        showError('选区中没有可上传的本地图片。请选择包含本地图片路径的文本区域。');
        return;
    }

    const config = await getUploadConfig();

    if (!config.providerConfig.bucket || !config.providerConfig.region) {
        showError('Please configure cloud storage settings first');
        return;
    }

    // Phase 1: Prepare and scan conflicts
    let preparation: UploadPreparation | null;
    try {
        preparation = await prepareUpload(editor, localImages, config, logger);
        if (!preparation) {
            return; // User cancelled or error occurred
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        showError(`准备上传失败：${message}`);
        logger.error('Upload preparation failed:', error);
        return;
    }

    // Phase 2: Execute upload
    try {
        await executeUpload(editor, preparation, logger);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        showError(`上传失败：${message}`);
        logger.error('Upload failed:', error);
    }
}

function buildCredentials(
    config: Awaited<ReturnType<typeof getUploadConfig>>['providerConfig']
): AliyunCredentials | TencentCredentials | null {
    // Config values are already substituted from .cmtx/config.yaml
    // No fallback to environment variables - use config file only

    if (config.provider === 'aliyun-oss') {
        if (!config.accessKeyId || !config.accessKeySecret) {
            return null;
        }
        return {
            provider: 'aliyun-oss',
            accessKeyId: config.accessKeyId,
            accessKeySecret: config.accessKeySecret,
            region: config.region,
            bucket: config.bucket,
        };
    }

    if (config.provider === 'tencent-cos') {
        if (!config.accessKeyId || !config.accessKeySecret) {
            return null;
        }
        return {
            provider: 'tencent-cos',
            secretId: config.accessKeyId,
            secretKey: config.accessKeySecret,
            region: config.region,
            bucket: config.bucket,
        };
    }

    return null;
}

/**
 * 上传准备阶段结果
 */
interface UploadPreparation {
    credentials: AliyunCredentials | TencentCredentials;
    adapter: IStorageAdapter;
    uploadConfig: ReturnType<ConfigBuilder['build']>;
    conflictResolutions: Map<string, 'skip' | 'replace' | 'download'>;
    baseDirectory: string;
    startOffset: number;
    endOffset: number;
    downloadResult?: DownloadResult;
}

interface PreparedConfig {
    credentials: Exclude<ReturnType<typeof buildCredentials>, null>;
    adapter: Awaited<ReturnType<typeof createAdapter>>;
    uploadConfig: Awaited<ReturnType<typeof import('@cmtx/asset').ConfigBuilder.prototype.build>>;
    baseDirectory: string;
}

async function prepareUploadConfig(
    config: Awaited<ReturnType<typeof getUploadConfig>>
): Promise<PreparedConfig | null> {
    const credentials = buildCredentials(config.providerConfig);
    if (!credentials) {
        showError('Missing cloud storage credentials');
        return null;
    }

    const adapter = await createAdapter(credentials);
    const uploadConfig = new ConfigBuilder()
        .storage(adapter, {
            prefix: config.providerConfig.path,
            namingTemplate: config.namingTemplate,
        })
        .replace({
            fields: {
                src: '{cloudSrc}',
                alt: '{originalAlt}',
            },
        })
        .build();
    uploadConfig.imageFormat = config.imageFormat;

    return { credentials, adapter, uploadConfig, baseDirectory: '' };
}

async function scanAndResolveConflicts(
    localImages: ImageMatch[],
    preparedConfig: PreparedConfig,
    config: Awaited<ReturnType<typeof getUploadConfig>>,
    logger: ReturnType<typeof getLogger>,
    baseDirectory: string
): Promise<{
    conflictResolutions: Map<string, 'skip' | 'replace' | 'download'>;
    downloadResult?: DownloadResult;
}> {
    const conflictResolutions = new Map<string, 'skip' | 'replace' | 'download'>();

    logger.info(`Scanning ${localImages.length} images for conflicts...`);
    const conflicts = await scanConflicts(
        localImages,
        baseDirectory,
        config.providerConfig.path || '',
        config.namingTemplate,
        preparedConfig.adapter
    );

    if (conflicts.length === 0) {
        return { conflictResolutions };
    }

    logger.info(`Found ${conflicts.length} conflicting files`);
    const resolution = await showConflictResolutionDialog(conflicts, baseDirectory);

    if (!resolution) {
        showInfo('上传已取消');
        throw new Error('Upload cancelled');
    }

    let downloadResult: DownloadResult | undefined;
    if (resolution.action === 'download' && resolution.downloadDir) {
        logger.info(
            `Downloading ${resolution.selectedFiles.length} files to ${resolution.downloadDir}`
        );
        downloadResult = await downloadRemoteFiles(
            resolution.selectedFiles,
            resolution.downloadDir,
            preparedConfig.adapter
        );

        if (downloadResult.errors?.length) {
            logger.warn('部分文件下载失败:', downloadResult.errors);
        }
        logger.info(
            `Download result: ${downloadResult.downloaded} downloaded, ${downloadResult.skipped} skipped`
        );
    }

    for (const file of resolution.selectedFiles) {
        conflictResolutions.set(file.fileName, resolution.action);
    }

    for (const conflict of conflicts) {
        if (!conflictResolutions.has(conflict.fileName)) {
            conflictResolutions.set(conflict.fileName, 'skip');
        }
    }

    return { conflictResolutions, downloadResult };
}

function buildUploadPreparation(
    editor: vscode.TextEditor,
    preparedConfig: PreparedConfig,
    conflictResolutions: Map<string, 'skip' | 'replace' | 'download'>,
    baseDirectory: string,
    downloadResult?: DownloadResult
): UploadPreparation {
    return {
        credentials: preparedConfig.credentials,
        adapter: preparedConfig.adapter,
        uploadConfig: preparedConfig.uploadConfig,
        conflictResolutions,
        baseDirectory,
        startOffset: editor.document.offsetAt(editor.selection.start),
        endOffset: editor.document.offsetAt(editor.selection.end),
        downloadResult,
    };
}

/**
 * 准备上传：扫描冲突并显示对话框
 */
async function prepareUpload(
    editor: vscode.TextEditor,
    localImages: ImageMatch[],
    config: Awaited<ReturnType<typeof getUploadConfig>>,
    logger: ReturnType<typeof getLogger>
): Promise<UploadPreparation | null> {
    const preparedConfig = await prepareUploadConfig(config);
    if (!preparedConfig) {
        return null;
    }

    const baseDirectory = dirname(editor.document.uri.fsPath);
    preparedConfig.baseDirectory = baseDirectory;

    try {
        const { conflictResolutions, downloadResult } = await scanAndResolveConflicts(
            localImages,
            preparedConfig,
            config,
            logger,
            baseDirectory
        );

        return buildUploadPreparation(
            editor,
            preparedConfig,
            conflictResolutions,
            baseDirectory,
            downloadResult
        );
    } catch (error) {
        if ((error as Error).message === 'Upload cancelled') {
            return null;
        }
        throw error;
    }
}

/**
 * 执行上传并显示结果
 */
async function executeUpload(
    editor: vscode.TextEditor,
    preparation: UploadPreparation,
    logger: ReturnType<typeof getLogger>
): Promise<void> {
    const result = await executeUploadPipeline({
        documentAccessor: new VsCodeDocumentAccessor(editor),
        config: preparation.uploadConfig,
        baseDirectory: preparation.baseDirectory,
        selection: {
            startOffset: preparation.startOffset,
            endOffset: preparation.endOffset,
        },
        logger: (level, message, meta) => {
            if (level === 'error') {
                logger.error(message, meta);
            } else if (level === 'warn') {
                logger.warn(message, meta);
            } else {
                logger.info(message, meta);
            }
        },
        onFileExists: async (fileName) => {
            return preparation.conflictResolutions.get(fileName) || 'replace';
        },
    });

    // Build result message
    const messages: string[] = [];
    if (result.uploaded > 0) {
        messages.push(`${result.uploaded} 个上传成功`);
    }
    if (result.replaced > 0) {
        messages.push(`${result.replaced} 个替换成功`);
    }
    if (preparation.downloadResult) {
        const { downloaded, skipped, errors } = preparation.downloadResult;
        if (downloaded > 0) {
            messages.push(`${downloaded} 个下载到 ${preparation.downloadResult.downloadDir}`);
        }
        if (skipped > 0) {
            messages.push(`${skipped} 个下载跳过（已存在）`);
        }
        if (errors && errors.length > 0) {
            messages.push(`${errors.length} 个下载失败`);
        }
    }

    const message = messages.length > 0 ? messages.join(', ') : '没有文件需要处理';
    showInfo(`上传完成：${message}`);
    logger.info(`Upload result: ${JSON.stringify(result)}`);

    // Clear selection
    editor.selection = new vscode.Selection(0, 0, 0, 0);
}
