/**
 * @packageDocumentation
 *
 * @module @cmtx/mcp-server
 *
 * MCP (Model Context Protocol) Server for CMTX
 *
 * @description
 * JSON-RPC 2.0 MCP 服务器，为 AI Agent 提供 Markdown 图片管理工具接口。
 * 支持图片扫描、上传、引用查找和安全删除等功能。
 *
 * @remarks
 * ## 核心功能
 *
 * ### 工具列表
 * - {@link scan.analyze} - 扫描分析本地图片引用
 * - {@link upload.preview} - 预览上传操作结果
 * - {@link upload.run} - 执行图片上传和引用替换
 * - {@link find.filesReferencingImage} - 查找引用指定图片的文件
 * - {@link find.referenceDetails} - 获取详细的引用位置信息
 * - {@link delete.safe} - 安全删除图片（检查引用）
 * - {@link delete.force} - 强制删除图片（需确认）
 *
 * ## 使用方式
 *
 * 通过 stdio 与 AI Agent 通信：
 * ```bash
 * node dist/bin/cmtx-mcp.js
 * ```
 *
 * @see {@link startServer} - 主要入口函数
 * @see [Model Context Protocol](https://modelcontextprotocol.io/) - MCP 官方文档
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { CloudCredentials, InternalTransferConfig } from '@cmtx/asset/transfer';
import { createTransferManager, createUrlParser } from '@cmtx/asset/transfer';
import { ConfigBuilder, uploadLocalImageInMarkdown } from '@cmtx/asset/upload';
import { deleteLocalImageSafely, filterImagesFromDirectory } from '@cmtx/core';
import { createAdapter } from '@cmtx/storage/adapters/factory';
import fg from 'fast-glob';

/**
 * JSON-RPC 2.0 请求接口
 *
 * @interface JsonRpcRequest
 * @property {"2.0"} jsonrpc - JSON-RPC 版本号
 * @property {number | string} [id] - 请求 ID（通知消息可省略）
 * @property {string} method - 方法名称
 * @property {Record<string, unknown>} [params] - 请求参数
 */
interface JsonRpcRequest {
    jsonrpc: '2.0';
    id?: number | string;
    method: string;
    params?: Record<string, unknown>;
}

/**
 * JSON-RPC 2.0 响应接口
 *
 * @interface JsonRpcResponse
 * @property {"2.0"} jsonrpc - JSON-RPC 版本号
 * @property {number | string} [id] - 对应请求的 ID
 * @property {Record<string, unknown>} [result] - 成功响应结果
 * @property {Object} [error] - 错误信息
 * @property {number} error.code - 错误代码
 * @property {string} error.message - 错误消息
 * @property {Record<string, unknown>} [error.data] - 错误附加数据
 */
interface JsonRpcResponse {
    jsonrpc: '2.0';
    id?: number | string;
    result?: Record<string, unknown>;
    error?: { code: number; message: string; data?: Record<string, unknown> };
}

/**
 * 向 stdout 写入 JSON-RPC 响应
 *
 * @param res - JSON-RPC 响应对象
 * @returns {void}
 */
function write(res: JsonRpcResponse): void {
    process.stdout.write(`${JSON.stringify(res)}\n`);
}

/**
 * 发送错误响应
 *
 * @param id - 请求 ID
 * @param code - 错误代码
 * @param message - 错误消息
 * @param data - 错误附加数据
 * @returns {void}
 */
function error(
    id: JsonRpcRequest['id'],
    code: number,
    message: string,
    data?: Record<string, unknown>
): void {
    write({ jsonrpc: '2.0', id, error: { code, message, data } });
}

function getStringArg(args: Record<string, unknown>, key: string): string | undefined {
    const val = args[key];
    return typeof val === 'string' ? val : undefined;
}

function getNumberArg(args: Record<string, unknown>, key: string): number | undefined {
    const val = args[key];
    return typeof val === 'number' ? val : undefined;
}

// TODO: 实现 getStringArrayArg 功能
// function getStringArrayArg(args: Record<string, unknown>, key: string): string[] | undefined {
//   const val = args[key];
//   return Array.isArray(val) && val.every((v) => typeof v === "string") ? val : undefined;
// }

function getBooleanArg(args: Record<string, unknown>, key: string): boolean {
    return args[key] === true;
}

/**
 * 启动 MCP 服务器
 *
 * @description
 * 初始化 JSON-RPC 服务器，监听 stdin 输入并处理工具调用请求。
 * 支持完整的 Model Context Protocol 2.0 规范。
 *
 * @returns {Promise<void>}
 *
 * @example
 * ```typescript
 * import { startServer } from '@cmtx/mcp-server';
 *
 * // 启动服务器
 * startServer().catch(console.error);
 * ```
 *
 * @remarks
 * 服务器启动后会：
 * 1. 发送工具列表初始化消息
 * 2. 监听 stdin 的 JSON-RPC 请求
 * 3. 根据请求调用相应工具
 * 4. 通过 stdout 返回响应结果
 *
 * @public
 */
export async function startServer(): Promise<void> {
    process.stdin.setEncoding('utf8');
    process.stdin.resume();

    write({
        jsonrpc: '2.0',
        result: {
            tools: [
                { name: 'scan.analyze', description: 'Scan local images and references' },
                {
                    name: 'upload.preview',
                    description: 'Preview remote paths and changes (dry-run)',
                },
                { name: 'upload.run', description: 'Upload and replace references' },
                {
                    name: 'transfer.analyze',
                    description: 'Analyze remote images for transfer',
                },
                { name: 'transfer.execute', description: 'Execute remote image transfer' },
                { name: 'transfer.preview', description: 'Preview transfer changes' },
                {
                    name: 'find.filesReferencingImage',
                    description: 'List files referencing an image',
                },
                { name: 'find.referenceDetails', description: 'Get detailed reference locations' },
                { name: 'delete.safe', description: 'Safe delete with reference check' },
                {
                    name: 'delete.force',
                    description: 'Force delete image (requires allowHardDelete)',
                },
            ],
        },
    });

    for await (const line of process.stdin) {
        let req: JsonRpcRequest;
        try {
            req = JSON.parse(line);
        } catch {
            error(undefined, 4400, 'Invalid JSON');
            continue;
        }

        const { id, method, params = {} } = req;
        const toolName = getStringArg(params, 'name');
        const args = (params.arguments as Record<string, unknown>) ?? params;

        try {
            if (method === 'tools.call' || method === 'call') {
                if (!toolName) {
                    error(id, 4400, 'Missing tool name');
                    continue;
                }

                const _projectRoot = getStringArg(args, 'projectRoot') ?? process.cwd();

                switch (toolName) {
                    case 'scan.analyze': {
                        const searchDir = getStringArg(args, 'searchDir');
                        if (!searchDir) {
                            error(id, 4400, 'Missing required parameter: searchDir');
                            break;
                        }

                        // 使用 core 包的目录扫描功能
                        const images = await filterImagesFromDirectory(searchDir, {
                            mode: 'sourceType',
                            value: 'local',
                        });

                        // 构造分析结果格式
                        const analysis = {
                            images: images.map((img) => ({
                                localPath: 'absLocalPath' in img ? img.absLocalPath : img.src,
                                fileSize: 0, // TODO: 实际文件大小
                                referencedIn: [], // TODO: 引用文件列表
                            })),
                            skipped: [],
                            totalSize: 0,
                            totalCount: images.length,
                        };

                        write({
                            jsonrpc: '2.0',
                            id,
                            result: analysis as unknown as Record<string, unknown>,
                        });
                        break;
                    }

                    case 'upload.preview': {
                        const searchDir = getStringArg(args, 'searchDir');
                        if (!searchDir) {
                            error(id, 4400, 'Missing required parameter: searchDir');
                            break;
                        }

                        // 使用 core 包的目录扫描功能
                        const images = await filterImagesFromDirectory(searchDir, {
                            mode: 'sourceType',
                            value: 'local',
                        });

                        // 构造预览结果
                        const preview = images.map((img) => ({
                            imagePath: 'absLocalPath' in img ? img.absLocalPath : img.src,
                            remotePath: '', // TODO: 实现命名策略
                            referencedIn: [],
                        }));

                        write({
                            jsonrpc: '2.0',
                            id,
                            result: {
                                preview,
                                totals: {
                                    toReplace: 0, // TODO: 计算实际引用数
                                    toDelete: images.length,
                                },
                            },
                        });
                        break;
                    }

                    case 'upload.run': {
                        const searchDir = getStringArg(args, 'searchDir');
                        if (!searchDir) {
                            error(id, 4400, 'Missing required parameter: searchDir');
                            break;
                        }

                        const provider =
                            (getStringArg(args, 'provider') as CloudCredentials['provider']) ||
                            'aliyun-oss';

                        let credentials: CloudCredentials;

                        if (provider === 'aliyun-oss') {
                            const region =
                                getStringArg(args, 'region') ??
                                process.env.ALIYUN_OSS_REGION ??
                                'oss-cn-hangzhou';
                            const accessKeyId =
                                getStringArg(args, 'accessKeyId') ??
                                process.env.ALIYUN_OSS_ACCESS_KEY_ID;
                            const accessKeySecret =
                                getStringArg(args, 'accessKeySecret') ??
                                process.env.ALIYUN_OSS_ACCESS_KEY_SECRET;
                            const bucket =
                                getStringArg(args, 'bucket') ?? process.env.ALIYUN_OSS_BUCKET;

                            if (!accessKeyId || !accessKeySecret || !bucket) {
                                error(id, 4101, 'Missing OSS credentials or bucket');
                                break;
                            }

                            credentials = {
                                provider: 'aliyun-oss',
                                accessKeyId,
                                accessKeySecret,
                                region,
                                bucket,
                            };
                        } else if (provider === 'tencent-cos') {
                            const region =
                                getStringArg(args, 'region') ??
                                process.env.TENCENT_COS_REGION ??
                                'ap-guangzhou';
                            const secretId =
                                getStringArg(args, 'secretId') ?? process.env.TENCENT_COS_SECRET_ID;
                            const secretKey =
                                getStringArg(args, 'secretKey') ??
                                process.env.TENCENT_COS_SECRET_KEY;
                            const bucket =
                                getStringArg(args, 'bucket') ?? process.env.TENCENT_COS_BUCKET;

                            if (!secretId || !secretKey || !bucket) {
                                error(id, 4101, 'Missing COS credentials or bucket');
                                break;
                            }

                            credentials = {
                                provider: 'tencent-cos',
                                secretId,
                                secretKey,
                                region,
                                bucket,
                            };
                        } else {
                            error(id, 4102, `Unsupported provider: ${provider}`);
                            break;
                        }

                        const adapter = await createAdapter(credentials);

                        // 使用新的 ConfigBuilder API
                        const config = new ConfigBuilder()
                            .storage(adapter, {
                                prefix: getStringArg(args, 'uploadPrefix'),
                                namingTemplate: getStringArg(args, 'namingTemplate'), // 注意：参数名已更新
                            })
                            .replace({
                                fields: {
                                    src: '{cloudSrc}',
                                    alt: '{originalAlt}',
                                },
                            })
                            .delete({
                                rootPath: searchDir,
                                strategy:
                                    (getStringArg(args, 'deletionStrategy') as string) === 'trash'
                                        ? 'trash'
                                        : 'hard-delete',
                                maxRetries: getNumberArg(args, 'maxDeletionRetries'),
                            })
                            .events((event) => {
                                write({ jsonrpc: '2.0', result: { event } });
                            })
                            .build();

                        // 使用现有的 uploadLocalImageInMarkdown 函数处理每个文件
                        const images = await filterImagesFromDirectory(searchDir, {
                            mode: 'sourceType',
                            value: 'local',
                        });

                        // 获取所有包含本地图片的 Markdown 文件
                        const filesWithImages = new Set<string>();
                        images.forEach((img) => {
                            if ('absLocalPath' in img && img.source === 'file') {
                                // 从图片路径推断所属的 Markdown 文件
                                const mdFiles = images
                                    .filter(
                                        (i) =>
                                            'absLocalPath' in i &&
                                            i.absLocalPath === img.absLocalPath &&
                                            i.source === 'file'
                                    )
                                    .map((i) => {
                                        if (i.source === 'file' && 'filePath' in i) {
                                            return (i as unknown as { filePath: string }).filePath;
                                        }
                                        return null;
                                    })
                                    .filter((f): f is string => f !== null);
                                mdFiles.forEach((file) => filesWithImages.add(file));
                            }
                        });

                        const results = [];

                        // 对每个文件执行上传
                        for (const filePath of Array.from(filesWithImages)) {
                            try {
                                const result = await uploadLocalImageInMarkdown(
                                    filePath,
                                    config,
                                    (level: string, message: string) => {
                                        write({
                                            jsonrpc: '2.0',
                                            result: { event: { level, message } },
                                        });
                                    }
                                );

                                results.push({
                                    filePath,
                                    success: result.success,
                                    uploaded: result.uploaded,
                                    replaced: result.replaced,
                                    deleted: result.deleted,
                                });
                            } catch (uploadError) {
                                results.push({
                                    filePath,
                                    success: false,
                                    error:
                                        uploadError instanceof Error
                                            ? uploadError.message
                                            : String(uploadError),
                                });
                            }
                        }

                        write({ jsonrpc: '2.0', id, result: { count: results.length, results } });
                        break;
                    }

                    case 'find.filesReferencingImage': {
                        const imagePath = getStringArg(args, 'imagePath');
                        const searchDir = getStringArg(args, 'searchDir');
                        const _depth = getNumberArg(args, 'depth');

                        if (!imagePath || !searchDir) {
                            error(id, 4400, 'Missing required parameters: imagePath, searchDir');
                            break;
                        }

                        // 实现文件引用查找功能
                        // 扫描目录中所有文件，查找引用指定图片的文件
                        const images = await filterImagesFromDirectory(
                            searchDir,
                            undefined,
                            undefined,
                            (level, message) => {
                                if (level === 'debug') return; // 减少调试日志
                                write({ jsonrpc: '2.0', result: { event: { level, message } } });
                            }
                        );

                        // 查找引用指定图片的所有文件
                        const referencingFiles = new Set<string>();

                        for (const img of images) {
                            // 检查是否是本地图片且路径匹配
                            if (img.type === 'local') {
                                const imgPath = 'absLocalPath' in img ? img.absLocalPath : img.src;

                                // 标准化路径进行比较
                                const normalizedImagePath = path.normalize(imagePath);
                                const normalizedImgPath = path.normalize(imgPath);

                                if (
                                    normalizedImagePath === normalizedImgPath ||
                                    normalizedImagePath.endsWith(path.basename(normalizedImgPath))
                                ) {
                                    // 从图片信息中提取文件路径
                                    if ('source' in img && img.source === 'file') {
                                        // 这里需要更好的方式获取文件路径
                                        // 由于当前 ImageMatch 类型不包含文件路径，我们暂时使用启发式方法
                                        const fileName = path.basename(imagePath);
                                        // 在所有文件中查找包含此图片引用的文件
                                        const allFiles = await fg(['**/*.md', '**/*.markdown'], {
                                            cwd: searchDir,
                                            absolute: true,
                                        });

                                        for (const file of allFiles) {
                                            try {
                                                const content = await readFile(file, 'utf-8');
                                                if (
                                                    content.includes(fileName) ||
                                                    content.includes(imagePath)
                                                ) {
                                                    referencingFiles.add(
                                                        path.relative(searchDir, file)
                                                    );
                                                }
                                            } catch {
                                                // 忽略读取错误
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        write({
                            jsonrpc: '2.0',
                            id,
                            result: {
                                files: Array.from(referencingFiles).sort(),
                            },
                        });
                        break;
                    }

                    case 'find.referenceDetails': {
                        const imagePath = getStringArg(args, 'imagePath');
                        const searchDir = getStringArg(args, 'searchDir');
                        const _depth = getNumberArg(args, 'depth');

                        if (!imagePath || !searchDir) {
                            error(id, 4400, 'Missing required parameters: imagePath, searchDir');
                            break;
                        }

                        // 实现引用详情查找功能
                        // 获取引用指定图片的详细位置信息
                        const referencingFiles = new Set<string>();
                        const references: Array<{
                            file: string;
                            locations: Array<{
                                line: number;
                                column: number;
                                text: string;
                            }>;
                        }> = [];

                        // 扫描所有 Markdown 文件
                        const allFiles = await fg(['**/*.md', '**/*.markdown'], {
                            cwd: searchDir,
                            absolute: true,
                        });

                        const fileName = path.basename(imagePath);

                        for (const file of allFiles) {
                            try {
                                const content = await readFile(file, 'utf-8');
                                const lines = content.split('\n');
                                const locations: Array<{
                                    line: number;
                                    column: number;
                                    text: string;
                                }> = [];

                                // 查找包含图片引用的行
                                for (let i = 0; i < lines.length; i++) {
                                    const line = lines[i];
                                    if (line.includes(fileName) || line.includes(imagePath)) {
                                        // 查找具体的引用位置
                                        // 创建 helper 函数来构建转义的正则表达式
                                        const escapeRegex = (str: string): string =>
                                            str.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

                                        const patterns = [
                                            new RegExp(
                                                String.raw`!\[[^\]]*\]\([^)]*${escapeRegex(fileName)}[^)]*\)`
                                            ),
                                            new RegExp(
                                                `<img[^>]*src=["'][^"']*${escapeRegex(fileName)}[^"']*["'][^>]*>`
                                            ),
                                            new RegExp(
                                                String.raw`\[.*\]:\s*[^\s]*${escapeRegex(fileName)}.*`
                                            ),
                                        ];

                                        for (const pattern of patterns) {
                                            const match = line.match(pattern);
                                            if (match?.index !== undefined) {
                                                locations.push({
                                                    line: i + 1, // 1-based 行号
                                                    column: match.index + 1, // 1-based 列号
                                                    text: match[0],
                                                });
                                            }
                                        }
                                    }
                                }

                                if (locations.length > 0) {
                                    referencingFiles.add(path.relative(searchDir, file));
                                    references.push({
                                        file: path.relative(searchDir, file),
                                        locations: locations.toSorted(
                                            (a, b) => a.line - b.line || a.column - b.column
                                        ),
                                    });
                                }
                            } catch {
                                // 忽略读取错误
                            }
                        }

                        write({
                            jsonrpc: '2.0',
                            id,
                            result: {
                                references: references,
                            },
                        });
                        break;
                    }

                    case 'transfer.analyze': {
                        const filePath = getStringArg(args, 'filePath');
                        const sourceDomain = getStringArg(args, 'sourceDomain');

                        if (!filePath) {
                            error(id, 4400, 'Missing required parameter: filePath');
                            break;
                        }

                        try {
                            const content = await readFile(filePath, 'utf-8');
                            const urlParser = createUrlParser({
                                sourceDomains: sourceDomain ? [sourceDomain] : [],
                            });

                            const parsedUrls = urlParser.parseSourceUrls(content);
                            const matchedUrls = parsedUrls.filter(
                                (url) => url.isMatch && url.remotePath
                            );

                            write({
                                jsonrpc: '2.0',
                                id,
                                result: {
                                    total: parsedUrls.length,
                                    matched: matchedUrls.length,
                                    images: matchedUrls.map((url) => ({
                                        originalUrl: url.originalUrl,
                                        remotePath: url.remotePath,
                                    })),
                                },
                            });
                        } catch (e) {
                            const msg = e instanceof Error ? e.message : String(e);
                            error(id, 4300, `Failed to analyze: ${msg}`);
                        }
                        break;
                    }

                    case 'transfer.preview': {
                        const filePath = getStringArg(args, 'filePath');
                        const sourceDomain = getStringArg(args, 'sourceDomain');
                        const targetDomain = getStringArg(args, 'targetDomain');
                        const prefix = getStringArg(args, 'prefix');

                        if (!filePath) {
                            error(id, 4400, 'Missing required parameter: filePath');
                            break;
                        }

                        try {
                            const content = await readFile(filePath, 'utf-8');
                            const urlParser = createUrlParser({
                                sourceDomains: sourceDomain ? [sourceDomain] : [],
                            });

                            const parsedUrls = urlParser.parseSourceUrls(content);
                            const matchedUrls = parsedUrls.filter(
                                (url) => url.isMatch && url.remotePath
                            );

                            const preview = matchedUrls.map((url) => {
                                const fileName = url.remotePath?.split('/').pop() || 'unknown';
                                const newRemotePath = prefix ? `${prefix}/${fileName}` : fileName;
                                const newUrl = targetDomain
                                    ? `${targetDomain.replace(/\/$/, '')}/${newRemotePath}`
                                    : newRemotePath;

                                return {
                                    originalUrl: url.originalUrl,
                                    newUrl,
                                    remotePath: url.remotePath,
                                    newRemotePath,
                                };
                            });

                            write({
                                jsonrpc: '2.0',
                                id,
                                result: {
                                    total: preview.length,
                                    preview,
                                },
                            });
                        } catch (e) {
                            const msg = e instanceof Error ? e.message : String(e);
                            error(id, 4300, `Failed to preview: ${msg}`);
                        }
                        break;
                    }

                    case 'transfer.execute': {
                        const filePath = getStringArg(args, 'filePath');
                        const provider =
                            (getStringArg(args, 'provider') as CloudCredentials['provider']) ||
                            'aliyun-oss';

                        if (!filePath) {
                            error(id, 4400, 'Missing required parameter: filePath');
                            break;
                        }

                        let sourceCredentials: CloudCredentials;
                        let targetCredentials: CloudCredentials;

                        if (provider === 'aliyun-oss') {
                            const sourceRegion =
                                getStringArg(args, 'sourceRegion') ??
                                process.env.SOURCE_REGION ??
                                'oss-cn-hangzhou';
                            const sourceAccessKeyId =
                                getStringArg(args, 'sourceAccessKeyId') ??
                                process.env.SOURCE_ACCESS_KEY_ID;
                            const sourceAccessKeySecret =
                                getStringArg(args, 'sourceAccessKeySecret') ??
                                process.env.SOURCE_ACCESS_KEY_SECRET;
                            const sourceBucket =
                                getStringArg(args, 'sourceBucket') ?? process.env.SOURCE_BUCKET;

                            const targetRegion =
                                getStringArg(args, 'targetRegion') ??
                                process.env.TARGET_REGION ??
                                'oss-cn-hangzhou';
                            const targetAccessKeyId =
                                getStringArg(args, 'targetAccessKeyId') ??
                                process.env.TARGET_ACCESS_KEY_ID;
                            const targetAccessKeySecret =
                                getStringArg(args, 'targetAccessKeySecret') ??
                                process.env.TARGET_ACCESS_KEY_SECRET;
                            const targetBucket =
                                getStringArg(args, 'targetBucket') ?? process.env.TARGET_BUCKET;

                            if (!sourceAccessKeyId || !sourceAccessKeySecret || !sourceBucket) {
                                error(id, 4101, 'Missing source OSS credentials or bucket');
                                break;
                            }

                            if (!targetAccessKeyId || !targetAccessKeySecret || !targetBucket) {
                                error(id, 4101, 'Missing target OSS credentials or bucket');
                                break;
                            }

                            sourceCredentials = {
                                provider: 'aliyun-oss',
                                accessKeyId: sourceAccessKeyId,
                                accessKeySecret: sourceAccessKeySecret,
                                region: sourceRegion,
                                bucket: sourceBucket,
                            };
                            targetCredentials = {
                                provider: 'aliyun-oss',
                                accessKeyId: targetAccessKeyId,
                                accessKeySecret: targetAccessKeySecret,
                                region: targetRegion,
                                bucket: targetBucket,
                            };
                        } else if (provider === 'tencent-cos') {
                            const sourceRegion =
                                getStringArg(args, 'sourceRegion') ??
                                process.env.SOURCE_REGION ??
                                'ap-guangzhou';
                            const sourceSecretId =
                                getStringArg(args, 'sourceSecretId') ??
                                process.env.SOURCE_SECRET_ID;
                            const sourceSecretKey =
                                getStringArg(args, 'sourceSecretKey') ??
                                process.env.SOURCE_SECRET_KEY;
                            const sourceBucket =
                                getStringArg(args, 'sourceBucket') ?? process.env.SOURCE_BUCKET;

                            const targetRegion =
                                getStringArg(args, 'targetRegion') ??
                                process.env.TARGET_REGION ??
                                'ap-guangzhou';
                            const targetSecretId =
                                getStringArg(args, 'targetSecretId') ??
                                process.env.TARGET_SECRET_ID;
                            const targetSecretKey =
                                getStringArg(args, 'targetSecretKey') ??
                                process.env.TARGET_SECRET_KEY;
                            const targetBucket =
                                getStringArg(args, 'targetBucket') ?? process.env.TARGET_BUCKET;

                            if (!sourceSecretId || !sourceSecretKey || !sourceBucket) {
                                error(id, 4101, 'Missing source COS credentials or bucket');
                                break;
                            }

                            if (!targetSecretId || !targetSecretKey || !targetBucket) {
                                error(id, 4101, 'Missing target COS credentials or bucket');
                                break;
                            }

                            sourceCredentials = {
                                provider: 'tencent-cos',
                                secretId: sourceSecretId,
                                secretKey: sourceSecretKey,
                                region: sourceRegion,
                                bucket: sourceBucket,
                            };
                            targetCredentials = {
                                provider: 'tencent-cos',
                                secretId: targetSecretId,
                                secretKey: targetSecretKey,
                                region: targetRegion,
                                bucket: targetBucket,
                            };
                        } else {
                            error(id, 4102, `Unsupported provider: ${provider}`);
                            break;
                        }

                        const sourceDomain = getStringArg(args, 'sourceDomain');
                        const targetDomain = getStringArg(args, 'targetDomain');
                        const prefix = getStringArg(args, 'prefix');
                        const overwrite = getBooleanArg(args, 'overwrite');
                        const concurrency = getNumberArg(args, 'concurrency') ?? 5;

                        try {
                            const sourceAdapter = await createAdapter(sourceCredentials);
                            const targetAdapter = await createAdapter(targetCredentials);

                            const transferConfig: InternalTransferConfig = {
                                source: {
                                    adapter: sourceAdapter,
                                    customDomain: sourceDomain,
                                },
                                target: {
                                    adapter: targetAdapter,
                                    customDomain: targetDomain,
                                    prefix,
                                    overwrite,
                                },
                                options: {
                                    concurrency,
                                    onProgress: (progress) => {
                                        write({
                                            jsonrpc: '2.0',
                                            result: {
                                                event: {
                                                    type: 'transfer:progress',
                                                    progress,
                                                },
                                            },
                                        });
                                    },
                                },
                            };

                            const manager = createTransferManager(transferConfig);
                            const result = await manager.transferMarkdown(filePath);

                            write({
                                jsonrpc: '2.0',
                                id,
                                result: {
                                    total: result.total,
                                    success: result.success,
                                    failed: result.failed,
                                    skipped: result.skipped,
                                    mappings: result.mappings,
                                    errors: result.errors,
                                },
                            });
                        } catch (e) {
                            const msg = e instanceof Error ? e.message : String(e);
                            error(id, 4300, `Transfer failed: ${msg}`);
                        }
                        break;
                    }

                    case 'delete.safe': {
                        const imagePath = getStringArg(args, 'imagePath');
                        const searchDir = getStringArg(args, 'searchDir');

                        if (!imagePath || !searchDir) {
                            error(id, 4400, 'Missing required parameters: imagePath, searchDir');
                            break;
                        }

                        const result = await deleteLocalImageSafely(imagePath, searchDir, {
                            strategy: 'move',
                        });

                        if (result.status === 'success') {
                            write({
                                jsonrpc: '2.0',
                                id,
                                result: { deleted: true, path: imagePath },
                            });
                        } else {
                            write({
                                jsonrpc: '2.0',
                                id,
                                result: { deleted: false, reason: result.error },
                            });
                        }
                        break;
                    }

                    case 'delete.force': {
                        const imagePath = getStringArg(args, 'imagePath');
                        const searchDir = getStringArg(args, 'searchDir');

                        if (!imagePath || !searchDir) {
                            error(id, 4400, 'Missing required parameters: imagePath, searchDir');
                            break;
                        }

                        if (!getBooleanArg(args, 'allowHardDelete')) {
                            error(id, 4400, 'Hard delete requires allowHardDelete=true for safety');
                            break;
                        }

                        try {
                            const result = await deleteLocalImageSafely(imagePath, searchDir, {
                                strategy: 'hard-delete',
                            });
                            if (result.status === 'success') {
                                write({
                                    jsonrpc: '2.0',
                                    id,
                                    result: { deleted: true, path: imagePath, forced: true },
                                });
                            } else {
                                error(id, 4300, `Cannot force delete: ${result.error}`);
                            }
                        } catch (e) {
                            const msg = e instanceof Error ? e.message : String(e);
                            error(id, 4301, `Hard delete failed: ${msg}`);
                        }
                        break;
                    }

                    default:
                        error(id, 4400, `Unknown tool: ${toolName}`);
                }
                continue;
            }

            error(id, 4400, `Unknown method: ${method}`);
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            error(id, 5000, msg);
        }
    }
}
