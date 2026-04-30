import path from "node:path";
import { FileService } from "@cmtx/asset/file";
import type { CloudCredentials, InternalTransferConfig } from "@cmtx/asset/transfer";
import { createTransferManager, createUrlParser } from "@cmtx/asset/transfer";
import { createAdapter } from "@cmtx/storage/adapters/factory";
import { createRuleEngineAdapter } from "./rules/rule-adapter.js";

interface JsonRpcRequest {
    jsonrpc: "2.0";
    id?: number | string;
    method: string;
    params?: Record<string, unknown>;
}

interface JsonRpcResponse {
    jsonrpc: "2.0";
    id?: number | string;
    result?: Record<string, unknown>;
    error?: { code: number; message: string; data?: Record<string, unknown> };
}

function write(res: JsonRpcResponse): void {
    process.stdout.write(`${JSON.stringify(res)}\n`);
}

function error(
    id: JsonRpcRequest["id"],
    code: number,
    message: string,
    data?: Record<string, unknown>,
): void {
    write({ jsonrpc: "2.0", id, error: { code, message, data } });
}

function getStringArg(args: Record<string, unknown>, key: string): string | undefined {
    const val = args[key];
    return typeof val === "string" ? val : undefined;
}

function getNumberArg(args: Record<string, unknown>, key: string): number | undefined {
    const val = args[key];
    return typeof val === "number" ? val : undefined;
}

function getBooleanArg(args: Record<string, unknown>, key: string): boolean {
    return args[key] === true;
}

export async function startServer(): Promise<void> {
    process.stdin.setEncoding("utf8");
    process.stdin.resume();

    const fileService = new FileService();

    write({
        jsonrpc: "2.0",
        result: {
            tools: [
                { name: "scan.analyze", description: "Scan local images and references" },
                {
                    name: "upload.preview",
                    description: "Preview remote paths and changes (dry-run)",
                },
                { name: "upload.run", description: "Upload and replace references" },
                { name: "transfer.analyze", description: "Analyze remote images for transfer" },
                { name: "transfer.execute", description: "Execute remote image transfer" },
                { name: "transfer.preview", description: "Preview transfer changes" },
                {
                    name: "find.filesReferencingImage",
                    description: "List files referencing an image",
                },
                { name: "find.referenceDetails", description: "Get detailed reference locations" },
                { name: "delete.safe", description: "Safe delete with reference check" },
                {
                    name: "delete.force",
                    description: "Force delete image (requires allowHardDelete)",
                },
            ],
        },
    });

    for await (const line of process.stdin) {
        let req: JsonRpcRequest;
        try {
            req = JSON.parse(line);
        } catch {
            error(undefined, 4400, "Invalid JSON");
            continue;
        }

        const { id, method, params = {} } = req;
        const toolName = getStringArg(params, "name");
        const args = (params.arguments as Record<string, unknown>) ?? params;

        try {
            if (method === "tools.call" || method === "call") {
                if (!toolName) {
                    error(id, 4400, "Missing tool name");
                    continue;
                }

                const projectRoot = getStringArg(args, "projectRoot") ?? process.cwd();

                switch (toolName) {
                    case "scan.analyze":
                        await handleScanAnalyze(id, args, fileService);
                        break;
                    case "upload.preview":
                        await handleUploadPreview(id, args, fileService);
                        break;
                    case "upload.run":
                        await handleUploadRun(id, args, fileService);
                        break;
                    case "find.filesReferencingImage":
                        await handleFindFilesReferencingImage(id, args, fileService);
                        break;
                    case "find.referenceDetails":
                        await handleFindReferenceDetails(id, args, fileService);
                        break;
                    case "transfer.analyze":
                        await handleTransferAnalyze(id, args, fileService);
                        break;
                    case "transfer.preview":
                        await handleTransferPreview(id, args, fileService);
                        break;
                    case "transfer.execute":
                        await handleTransferExecute(id, args, projectRoot);
                        break;
                    case "delete.safe":
                        await handleDeleteSafe(id, args, fileService);
                        break;
                    case "delete.force":
                        await handleDeleteForce(id, args, fileService);
                        break;
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

async function handleScanAnalyze(
    id: JsonRpcRequest["id"],
    args: Record<string, unknown>,
    fileService: FileService,
): Promise<void> {
    const searchDir = getStringArg(args, "searchDir");
    if (!searchDir) {
        error(id, 4400, "Missing required parameter: searchDir");
        return;
    }

    const images = await fileService.filterImagesFromDirectory(searchDir, {
        mode: "sourceType",
        value: "local",
    });

    const analysis = {
        images: images.map((img) => ({
            localPath: "absLocalPath" in img ? img.absLocalPath : img.src,
            fileSize: 0,
            referencedIn: [],
        })),
        skipped: [],
        totalSize: 0,
        totalCount: images.length,
    };

    write({
        jsonrpc: "2.0",
        id,
        result: analysis as unknown as Record<string, unknown>,
    });
}

async function handleUploadPreview(
    id: JsonRpcRequest["id"],
    args: Record<string, unknown>,
    fileService: FileService,
): Promise<void> {
    const searchDir = getStringArg(args, "searchDir");
    if (!searchDir) {
        error(id, 4400, "Missing required parameter: searchDir");
        return;
    }

    const images = await fileService.filterImagesFromDirectory(searchDir, {
        mode: "sourceType",
        value: "local",
    });

    const preview = images.map((img) => ({
        imagePath: "absLocalPath" in img ? img.absLocalPath : img.src,
        remotePath: "",
        referencedIn: [],
    }));

    write({
        jsonrpc: "2.0",
        id,
        result: {
            preview,
            totals: {
                toReplace: 0,
                toDelete: images.length,
            },
        },
    });
}

async function handleUploadRun(
    id: JsonRpcRequest["id"],
    args: Record<string, unknown>,
    fileService: FileService,
): Promise<void> {
    const searchDir = getStringArg(args, "searchDir");
    if (!searchDir) {
        error(id, 4400, "Missing required parameter: searchDir");
        return;
    }

    const provider =
        (getStringArg(args, "provider") as CloudCredentials["provider"]) || "aliyun-oss";

    let credentials: CloudCredentials;

    if (provider === "aliyun-oss") {
        const region =
            getStringArg(args, "region") ?? process.env.ALIYUN_OSS_REGION ?? "oss-cn-hangzhou";
        const accessKeyId =
            getStringArg(args, "accessKeyId") ?? process.env.ALIYUN_OSS_ACCESS_KEY_ID;
        const accessKeySecret =
            getStringArg(args, "accessKeySecret") ?? process.env.ALIYUN_OSS_ACCESS_KEY_SECRET;
        const bucket = getStringArg(args, "bucket") ?? process.env.ALIYUN_OSS_BUCKET;

        if (!accessKeyId || !accessKeySecret || !bucket) {
            error(id, 4101, "Missing OSS credentials or bucket");
            return;
        }

        credentials = {
            provider: "aliyun-oss",
            accessKeyId,
            accessKeySecret,
            region,
            bucket,
        };
    } else if (provider === "tencent-cos") {
        const region =
            getStringArg(args, "region") ?? process.env.TENCENT_COS_REGION ?? "ap-guangzhou";
        const secretId = getStringArg(args, "secretId") ?? process.env.TENCENT_COS_SECRET_ID;
        const secretKey = getStringArg(args, "secretKey") ?? process.env.TENCENT_COS_SECRET_KEY;
        const bucket = getStringArg(args, "bucket") ?? process.env.TENCENT_COS_BUCKET;

        if (!secretId || !secretKey || !bucket) {
            error(id, 4101, "Missing COS credentials or bucket");
            return;
        }

        credentials = {
            provider: "tencent-cos",
            secretId,
            secretKey,
            region,
            bucket,
        };
    } else {
        error(id, 4102, `Unsupported provider: ${String(provider)}`);
        return;
    }

    const adapter = await createAdapter(credentials);

    const ruleAdapter = await createRuleEngineAdapter();
    ruleAdapter.configureCore();
    ruleAdapter.configureStorage(adapter, {
        prefix: getStringArg(args, "uploadPrefix") || "",
        namingTemplate: getStringArg(args, "namingTemplate"),
    });

    const images = await fileService.filterImagesFromDirectory(searchDir, {
        mode: "sourceType",
        value: "local",
    });

    const filesWithImages = new Set<string>();
    images.forEach((img) => {
        if ("absLocalPath" in img && img.source === "file") {
            const mdFiles = images
                .filter(
                    (i) =>
                        "absLocalPath" in i &&
                        i.absLocalPath === img.absLocalPath &&
                        i.source === "file",
                )
                .map((i) => {
                    if (i.source === "file" && "filePath" in i) {
                        return (i as unknown as { filePath: string }).filePath;
                    }
                    return null;
                })
                .filter((f): f is string => f !== null);
            mdFiles.forEach((file) => filesWithImages.add(file));
        }
    });

    const results: Array<Record<string, unknown>> = [];

    for (const filePath of Array.from(filesWithImages)) {
        try {
            const fs = await import("node:fs/promises");
            const document = await fs.readFile(filePath, "utf-8");

            const result = await ruleAdapter.executeRule("upload-images", document, filePath, {
                baseDirectory: filePath,
                ruleConfig: { upload: true },
            });

            if (result.modified) {
                await fs.writeFile(filePath, result.content, "utf-8");
            }

            results.push({
                filePath,
                success: true,
                messages: result.messages,
            });
        } catch (uploadError) {
            results.push({
                filePath,
                success: false,
                error: uploadError instanceof Error ? uploadError.message : String(uploadError),
            });
        }
    }

    write({
        jsonrpc: "2.0",
        id,
        result: { count: results.length, results },
    });
}

async function handleFindFilesReferencingImage(
    id: JsonRpcRequest["id"],
    args: Record<string, unknown>,
    fileService: FileService,
): Promise<void> {
    const imagePath = getStringArg(args, "imagePath");
    const searchDir = getStringArg(args, "searchDir");

    if (!imagePath || !searchDir) {
        error(id, 4400, "Missing required parameters: imagePath, searchDir");
        return;
    }

    const images = await fileService.filterImagesFromDirectory(searchDir, undefined, undefined);

    const referencingFiles = new Set<string>();

    for (const img of images) {
        if (img.type === "local") {
            const imgPath = "absLocalPath" in img ? img.absLocalPath : img.src;

            const normalizedImagePath = path.normalize(imagePath);
            const normalizedImgPath = path.normalize(imgPath);

            if (
                normalizedImagePath === normalizedImgPath ||
                normalizedImagePath.endsWith(path.basename(normalizedImgPath))
            ) {
                if ("source" in img && img.source === "file") {
                    const fileName = path.basename(imagePath);
                    const allFiles = await fileService.scanDirectory(searchDir, {
                        patterns: ["**/*.md", "**/*.markdown"],
                    });

                    for (const fPath of allFiles) {
                        try {
                            const content = await fileService.readFileContent(fPath);
                            if (content.includes(fileName) || content.includes(imagePath)) {
                                referencingFiles.add(path.relative(searchDir, fPath));
                            }
                        } catch {
                            // ignore
                        }
                    }
                }
            }
        }
    }

    write({
        jsonrpc: "2.0",
        id,
        result: {
            files: Array.from(referencingFiles).sort(),
        },
    });
}

async function handleFindReferenceDetails(
    id: JsonRpcRequest["id"],
    args: Record<string, unknown>,
    fileService: FileService,
): Promise<void> {
    const imagePath = getStringArg(args, "imagePath");
    const searchDir = getStringArg(args, "searchDir");

    if (!imagePath || !searchDir) {
        error(id, 4400, "Missing required parameters: imagePath, searchDir");
        return;
    }

    const references: Array<{
        file: string;
        locations: Array<{ line: number; column: number; text: string }>;
    }> = [];

    const allFiles = await fileService.scanDirectory(searchDir, {
        patterns: ["**/*.md", "**/*.markdown"],
    });

    const fileName = path.basename(imagePath);

    for (const fPath of allFiles) {
        try {
            const content = await fileService.readFileContent(fPath);
            const lines = content.split("\n");
            const locations: Array<{ line: number; column: number; text: string }> = [];

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (line.includes(fileName) || line.includes(imagePath)) {
                    const escapeRegex = (str: string): string =>
                        str.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

                    const patterns = [
                        new RegExp(String.raw`!\[[^\]]*\]\([^)]*${escapeRegex(fileName)}[^)]*\)`),
                        new RegExp(
                            `<img[^>]*src=["'][^"']*${escapeRegex(fileName)}[^"']*["'][^>]*>`,
                        ),
                        new RegExp(String.raw`\[.*\]:\s*[^\s]*${escapeRegex(fileName)}.*`),
                    ];

                    for (const pattern of patterns) {
                        const match = line.match(pattern);
                        if (match?.index !== undefined) {
                            locations.push({
                                line: i + 1,
                                column: match.index + 1,
                                text: match[0],
                            });
                        }
                    }
                }
            }

            if (locations.length > 0) {
                references.push({
                    file: path.relative(searchDir, fPath),
                    locations: locations.toSorted((a, b) => a.line - b.line || a.column - b.column),
                });
            }
        } catch {
            // ignore
        }
    }

    write({
        jsonrpc: "2.0",
        id,
        result: { references },
    });
}

async function handleTransferAnalyze(
    id: JsonRpcRequest["id"],
    args: Record<string, unknown>,
    fileService: FileService,
): Promise<void> {
    const filePath = getStringArg(args, "filePath");
    const sourceDomain = getStringArg(args, "sourceDomain");

    if (!filePath) {
        error(id, 4400, "Missing required parameter: filePath");
        return;
    }

    try {
        const content = await fileService.readFileContent(filePath);
        const urlParser = createUrlParser({
            sourceDomains: sourceDomain ? [sourceDomain] : [],
        });

        const parsedUrls = urlParser.parseSourceUrls(content);
        const matchedUrls = parsedUrls.filter((url) => url.isMatch && url.remotePath);

        write({
            jsonrpc: "2.0",
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
}

async function handleTransferPreview(
    id: JsonRpcRequest["id"],
    args: Record<string, unknown>,
    fileService: FileService,
): Promise<void> {
    const filePath = getStringArg(args, "filePath");
    const sourceDomain = getStringArg(args, "sourceDomain");
    const targetDomain = getStringArg(args, "targetDomain");
    const prefix = getStringArg(args, "prefix");

    if (!filePath) {
        error(id, 4400, "Missing required parameter: filePath");
        return;
    }

    try {
        const content = await fileService.readFileContent(filePath);
        const urlParser = createUrlParser({
            sourceDomains: sourceDomain ? [sourceDomain] : [],
        });

        const parsedUrls = urlParser.parseSourceUrls(content);
        const matchedUrls = parsedUrls.filter((url) => url.isMatch && url.remotePath);

        const preview = matchedUrls.map((url) => {
            const fileName = url.remotePath?.split("/").pop() || "unknown";
            const newRemotePath = prefix ? `${prefix}/${fileName}` : fileName;
            const newUrl = targetDomain
                ? `${targetDomain.replace(/\/$/, "")}/${newRemotePath}`
                : newRemotePath;

            return {
                originalUrl: url.originalUrl,
                newUrl,
                remotePath: url.remotePath,
                newRemotePath,
            };
        });

        write({
            jsonrpc: "2.0",
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
}

async function handleTransferExecute(
    id: JsonRpcRequest["id"],
    args: Record<string, unknown>,
    _projectRoot: string,
): Promise<void> {
    const filePath = getStringArg(args, "filePath");
    const provider =
        (getStringArg(args, "provider") as CloudCredentials["provider"]) || "aliyun-oss";

    if (!filePath) {
        error(id, 4400, "Missing required parameter: filePath");
        return;
    }

    let sourceCredentials: CloudCredentials;
    let targetCredentials: CloudCredentials;

    if (provider === "aliyun-oss") {
        const sourceRegion =
            getStringArg(args, "sourceRegion") ?? process.env.SOURCE_REGION ?? "oss-cn-hangzhou";
        const sourceAccessKeyId =
            getStringArg(args, "sourceAccessKeyId") ?? process.env.SOURCE_ACCESS_KEY_ID;
        const sourceAccessKeySecret =
            getStringArg(args, "sourceAccessKeySecret") ?? process.env.SOURCE_ACCESS_KEY_SECRET;
        const sourceBucket = getStringArg(args, "sourceBucket") ?? process.env.SOURCE_BUCKET;

        const targetRegion =
            getStringArg(args, "targetRegion") ?? process.env.TARGET_REGION ?? "oss-cn-hangzhou";
        const targetAccessKeyId =
            getStringArg(args, "targetAccessKeyId") ?? process.env.TARGET_ACCESS_KEY_ID;
        const targetAccessKeySecret =
            getStringArg(args, "targetAccessKeySecret") ?? process.env.TARGET_ACCESS_KEY_SECRET;
        const targetBucket = getStringArg(args, "targetBucket") ?? process.env.TARGET_BUCKET;

        if (!sourceAccessKeyId || !sourceAccessKeySecret || !sourceBucket) {
            error(id, 4101, "Missing source OSS credentials or bucket");
            return;
        }
        if (!targetAccessKeyId || !targetAccessKeySecret || !targetBucket) {
            error(id, 4101, "Missing target OSS credentials or bucket");
            return;
        }

        sourceCredentials = {
            provider: "aliyun-oss",
            accessKeyId: sourceAccessKeyId,
            accessKeySecret: sourceAccessKeySecret,
            region: sourceRegion,
            bucket: sourceBucket,
        };
        targetCredentials = {
            provider: "aliyun-oss",
            accessKeyId: targetAccessKeyId,
            accessKeySecret: targetAccessKeySecret,
            region: targetRegion,
            bucket: targetBucket,
        };
    } else if (provider === "tencent-cos") {
        const sourceRegion =
            getStringArg(args, "sourceRegion") ?? process.env.SOURCE_REGION ?? "ap-guangzhou";
        const sourceSecretId = getStringArg(args, "sourceSecretId") ?? process.env.SOURCE_SECRET_ID;
        const sourceSecretKey =
            getStringArg(args, "sourceSecretKey") ?? process.env.SOURCE_SECRET_KEY;
        const sourceBucket = getStringArg(args, "sourceBucket") ?? process.env.SOURCE_BUCKET;

        const targetRegion =
            getStringArg(args, "targetRegion") ?? process.env.TARGET_REGION ?? "ap-guangzhou";
        const targetSecretId = getStringArg(args, "targetSecretId") ?? process.env.TARGET_SECRET_ID;
        const targetSecretKey =
            getStringArg(args, "targetSecretKey") ?? process.env.TARGET_SECRET_KEY;
        const targetBucket = getStringArg(args, "targetBucket") ?? process.env.TARGET_BUCKET;

        if (!sourceSecretId || !sourceSecretKey || !sourceBucket) {
            error(id, 4101, "Missing source COS credentials or bucket");
            return;
        }
        if (!targetSecretId || !targetSecretKey || !targetBucket) {
            error(id, 4101, "Missing target COS credentials or bucket");
            return;
        }

        sourceCredentials = {
            provider: "tencent-cos",
            secretId: sourceSecretId,
            secretKey: sourceSecretKey,
            region: sourceRegion,
            bucket: sourceBucket,
        };
        targetCredentials = {
            provider: "tencent-cos",
            secretId: targetSecretId,
            secretKey: targetSecretKey,
            region: targetRegion,
            bucket: targetBucket,
        };
    } else {
        error(id, 4102, `Unsupported provider: ${String(provider)}`);
        return;
    }

    const sourceDomain = getStringArg(args, "sourceDomain");
    const targetDomain = getStringArg(args, "targetDomain");
    const prefix = getStringArg(args, "prefix");
    const overwrite = getBooleanArg(args, "overwrite");
    const concurrency = getNumberArg(args, "concurrency") ?? 5;

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
                        jsonrpc: "2.0",
                        result: {
                            event: {
                                type: "transfer:progress",
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
            jsonrpc: "2.0",
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
}

async function handleDeleteSafe(
    id: JsonRpcRequest["id"],
    args: Record<string, unknown>,
    fileService: FileService,
): Promise<void> {
    const imagePath = getStringArg(args, "imagePath");
    const searchDir = getStringArg(args, "searchDir");

    if (!imagePath || !searchDir) {
        error(id, 4400, "Missing required parameters: imagePath, searchDir");
        return;
    }

    const result = await fileService.deleteLocalImageSafely(imagePath, searchDir, {
        strategy: "move",
    });

    if (result.status === "success") {
        write({
            jsonrpc: "2.0",
            id,
            result: { deleted: true, path: imagePath },
        });
    } else {
        write({
            jsonrpc: "2.0",
            id,
            result: {
                deleted: false,
                reason: result.error,
            },
        });
    }
}

async function handleDeleteForce(
    id: JsonRpcRequest["id"],
    args: Record<string, unknown>,
    fileService: FileService,
): Promise<void> {
    const imagePath = getStringArg(args, "imagePath");
    const searchDir = getStringArg(args, "searchDir");

    if (!imagePath || !searchDir) {
        error(id, 4400, "Missing required parameters: imagePath, searchDir");
        return;
    }

    if (!getBooleanArg(args, "allowHardDelete")) {
        error(id, 4400, "Hard delete requires allowHardDelete=true for safety");
        return;
    }

    try {
        const result = await fileService.deleteLocalImageSafely(imagePath, searchDir, {
            strategy: "hard-delete",
        });
        if (result.status === "success") {
            write({
                jsonrpc: "2.0",
                id,
                result: {
                    deleted: true,
                    path: imagePath,
                    forced: true,
                },
            });
        } else {
            error(id, 4300, `Cannot force delete: ${result.error}`);
        }
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        error(id, 4301, `Hard delete failed: ${msg}`);
    }
}
