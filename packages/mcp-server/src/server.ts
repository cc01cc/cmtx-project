import OSS from "ali-oss";
import { analyzeImages, uploadAndReplace, applyNamingStrategy } from "@cmtx/upload";
import { AliOSSAdapter } from "@cmtx/upload/adapters/ali-oss";
import { findFilesReferencingImage, getImageReferenceDetails, safeDeleteLocalImage } from "@cmtx/core";

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
  process.stdout.write(JSON.stringify(res) + "\n");
}

function error(id: JsonRpcRequest["id"], code: number, message: string, data?: Record<string, unknown>): void {
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

function getStringArrayArg(args: Record<string, unknown>, key: string): string[] | undefined {
  const val = args[key];
  return Array.isArray(val) && val.every((v) => typeof v === "string") ? val : undefined;
}

function getBooleanArg(args: Record<string, unknown>, key: string): boolean {
  return args[key] === true;
}

export async function startServer(): Promise<void> {
  process.stdin.setEncoding("utf8");
  process.stdin.resume();

  write({
    jsonrpc: "2.0",
    result: {
      tools: [
        { name: "scan.analyze", description: "Scan local images and references" },
        { name: "upload.preview", description: "Preview remote paths and changes (dry-run)" },
        { name: "upload.run", description: "Upload and replace references" },
        { name: "find.filesReferencingImage", description: "List files referencing an image" },
        { name: "find.referenceDetails", description: "Get detailed reference locations" },
        { name: "delete.safe", description: "Safe delete with reference check" },
        { name: "delete.force", description: "Force delete image (requires allowHardDelete)" },
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
          case "scan.analyze": {
            const searchDir = getStringArg(args, "searchDir");
            if (!searchDir) {
              error(id, 4400, "Missing required parameter: searchDir");
              break;
            }

            const analysis = await analyzeImages({
              projectRoot,
              searchDir,
              localPrefixes: getStringArrayArg(args, "localPrefixes"),
              uploadPrefix: getStringArg(args, "uploadPrefix"),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              namingStrategy: (getStringArg(args, "namingStrategy") as any),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              deletionStrategy: (getStringArg(args, "deletionStrategy") as any),
              maxFileSize: getNumberArg(args, "maxFileSize"),
              allowedExtensions: getStringArrayArg(args, "allowedExtensions"),
            });
            write({ jsonrpc: "2.0", id, result: analysis as unknown as Record<string, unknown> });
            break;
          }

          case "upload.preview": {
            const searchDir = getStringArg(args, "searchDir");
            if (!searchDir) {
              error(id, 4400, "Missing required parameter: searchDir");
              break;
            }

            const analysis = await analyzeImages({
              projectRoot,
              searchDir,
              localPrefixes: getStringArrayArg(args, "localPrefixes"),
              uploadPrefix: getStringArg(args, "uploadPrefix"),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              namingStrategy: (getStringArg(args, "namingStrategy") as any),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              deletionStrategy: (getStringArg(args, "deletionStrategy") as any),
              maxFileSize: getNumberArg(args, "maxFileSize"),
              allowedExtensions: getStringArrayArg(args, "allowedExtensions"),
            });

            const preview = await Promise.all(
              analysis.images.map(async (img) => ({
                imagePath: img.localPath,
                remotePath:
                  img.previewRemotePath ??
                  (await applyNamingStrategy({
                    localPath: img.localPath,
                    uploadPrefix: getStringArg(args, "uploadPrefix"),
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    namingStrategy: (getStringArg(args, "namingStrategy") as any),
                  })),
                referencedIn: img.referencedIn,
              })),
            );

            write({
              jsonrpc: "2.0",
              id,
              result: {
                preview,
                totals: {
                  toReplace: preview.reduce((sum, i) => sum + i.referencedIn.length, 0),
                  toDelete: analysis.images.length,
                },
              },
            });
            break;
          }

          case "upload.run": {
            const searchDir = getStringArg(args, "searchDir");
            if (!searchDir) {
              error(id, 4400, "Missing required parameter: searchDir");
              break;
            }

            const region = getStringArg(args, "region") ?? process.env.OSS_REGION ?? "oss-cn-hangzhou";
            const accessKeyId = getStringArg(args, "accessKeyId") ?? process.env.OSS_ACCESS_KEY_ID;
            const accessKeySecret = getStringArg(args, "accessKeySecret") ?? process.env.OSS_ACCESS_KEY_SECRET;
            const bucket = getStringArg(args, "bucket") ?? process.env.OSS_BUCKET;

            if (!accessKeyId || !accessKeySecret || !bucket) {
              error(id, 4101, "Missing OSS credentials or bucket");
              break;
            }

            const client = new OSS({
              region,
              accessKeyId,
              accessKeySecret,
              bucket,
            });

            const adapter = new AliOSSAdapter(client);
            const results = await uploadAndReplace({
              projectRoot,
              searchDir,
              adapter,
              uploadPrefix: getStringArg(args, "uploadPrefix"),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              namingStrategy: (getStringArg(args, "namingStrategy") as any),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              deletionStrategy: (getStringArg(args, "deletionStrategy") as any),
              trashDir: getStringArg(args, "trashDir"),
              maxDeletionRetries: getNumberArg(args, "maxDeletionRetries"),
              onEvent: (evt) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                write({ jsonrpc: "2.0", result: { event: evt as any as Record<string, unknown> } });
              },
            });

            write({ jsonrpc: "2.0", id, result: { count: results.length, results } });
            break;
          }

          case "find.filesReferencingImage": {
            const imagePath = getStringArg(args, "imagePath");
            const searchDir = getStringArg(args, "searchDir");
            const depth = getNumberArg(args, "depth");

            if (!imagePath || !searchDir) {
              error(id, 4400, "Missing required parameters: imagePath, searchDir");
              break;
            }

            const files = await findFilesReferencingImage(imagePath, searchDir, {
              projectRoot,
              depth,
            });

            write({ jsonrpc: "2.0", id, result: { files: files.map((f) => f.relativePath) } });
            break;
          }

          case "find.referenceDetails": {
            const imagePath = getStringArg(args, "imagePath");
            const searchDir = getStringArg(args, "searchDir");
            const depth = getNumberArg(args, "depth");

            if (!imagePath || !searchDir) {
              error(id, 4400, "Missing required parameters: imagePath, searchDir");
              break;
            }

            const details = await getImageReferenceDetails(imagePath, searchDir, {
              projectRoot,
              depth,
            });

            write({
              jsonrpc: "2.0",
              id,
              result: {
                references: details.map((ref) => ({
                  file: ref.absolutePath,
                  locations: ref.locations.map((loc) => ({
                    line: loc.line,
                    column: loc.column,
                    text: loc.lineText,
                  })),
                })),
              },
            });
            break;
          }

          case "delete.safe": {
            const imagePath = getStringArg(args, "imagePath");
            const searchDir = getStringArg(args, "searchDir");

            if (!imagePath || !searchDir) {
              error(id, 4400, "Missing required parameters: imagePath, searchDir");
              break;
            }

            const result = await safeDeleteLocalImage(searchDir, imagePath, {
              projectRoot,
            });

            if (result.deleted) {
              write({ jsonrpc: "2.0", id, result: { deleted: true, path: result.path } });
            } else {
              write({
                jsonrpc: "2.0",
                id,
                result: { deleted: false, reason: result.reason, file: result.firstReference.absolutePath },
              });
            }
            break;
          }

          case "delete.force": {
            const imagePath = getStringArg(args, "imagePath");
            const searchDir = getStringArg(args, "searchDir");

            if (!imagePath || !searchDir) {
              error(id, 4400, "Missing required parameters: imagePath, searchDir");
              break;
            }

            if (!getBooleanArg(args, "allowHardDelete")) {
              error(id, 4400, "Hard delete requires allowHardDelete=true for safety");
              break;
            }

            try {
              const result = await safeDeleteLocalImage(searchDir, imagePath, {
                projectRoot,
              });
              if (result.deleted) {
                write({
                  jsonrpc: "2.0",
                  id,
                  result: { deleted: true, path: result.path, forced: true },
                });
              } else {
                error(id, 4300, `Cannot force delete: image is referenced (reason: ${result.reason})`);
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
