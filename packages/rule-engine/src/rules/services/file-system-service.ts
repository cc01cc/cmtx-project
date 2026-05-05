import { mkdir, readFile, stat, copyFile as fsCopy, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { spawn } from "node:child_process";

import { filterImagesInText, upsertFrontmatterFields } from "@cmtx/core";
import { MarkdownMetadataExtractor } from "../../metadata/markdown-metadata-extractor.js";
import type { AssetRef, FileSystemService, FileSystemServiceConfig } from "../service-registry.js";

const extractor = new MarkdownMetadataExtractor();

async function detectGitRoot(startPath: string): Promise<string | null> {
    try {
        const stat_ = await stat(startPath);
        if (!stat_.isDirectory()) {
            startPath = dirname(startPath);
        }
        return new Promise((resolve_) => {
            const proc = spawn("git", ["rev-parse", "--show-toplevel"], {
                cwd: startPath,
                stdio: ["ignore", "pipe", "pipe"],
            });
            let output = "";
            proc.stdout.on("data", (chunk: Buffer) => {
                output += chunk.toString();
            });
            proc.on("close", (code) => {
                resolve_(code === 0 ? output.trim() : null);
            });
            proc.on("error", () => resolve_(null));
        });
    } catch {
        return null;
    }
}

export class FileSystemServiceImpl implements FileSystemService {
    readonly id = "filesystem" as const;
    private config: FileSystemServiceConfig;

    constructor(config?: FileSystemServiceConfig) {
        this.config = config ?? {};
    }

    initialize(_config?: FileSystemServiceConfig): void {
        this.config = _config ?? {};
    }

    async createDirectory(path: string): Promise<void> {
        await mkdir(path, { recursive: true });
    }

    async writeFile(path: string, content: string): Promise<void> {
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, content, "utf-8");
    }

    async copyFile(src: string, dest: string): Promise<void> {
        await mkdir(dirname(dest), { recursive: true });
        await fsCopy(src, dest);
    }

    async scanAssets(sourceDir: string, mdContent: string): Promise<AssetRef[]> {
        const images = filterImagesInText(mdContent);
        const results: AssetRef[] = [];

        for (const img of images) {
            const srcPath = img.src;
            if (
                !srcPath ||
                srcPath.startsWith("http://") ||
                srcPath.startsWith("https://") ||
                srcPath.startsWith("data:")
            ) {
                continue;
            }

            const absPath = isAbsolute(srcPath) ? srcPath : resolve(sourceDir, srcPath);
            results.push({
                originalPath: srcPath,
                absolutePath: absPath,
                basename: basename(srcPath),
            });
        }

        return results;
    }

    async readFileFrontMatter(path: string): Promise<Record<string, string>> {
        try {
            const metadata = await extractor.extractFromFile(path);
            return Object.fromEntries(
                Object.entries(metadata)
                    .filter(
                        ([, v]) =>
                            typeof v === "string" ||
                            typeof v === "number" ||
                            typeof v === "boolean",
                    )
                    .map(([k, v]) => [k, String(v)]),
            );
        } catch {
            return {};
        }
    }

    async updateFileFrontMatter(path: string, fields: Record<string, string>): Promise<void> {
        const content = await readFile(path, "utf-8");
        const result = upsertFrontmatterFields(content, fields);
        if (result.success && result.markdown !== content) {
            await writeFile(path, result.markdown, "utf-8");
        }
    }

    async detectWorkspaceRoot(path: string): Promise<string | null> {
        return detectGitRoot(path);
    }

    async isSameWorkspace(pathA: string, pathB: string): Promise<boolean> {
        const rootA = await detectGitRoot(pathA);
        const rootB = await detectGitRoot(pathB);
        if (!rootA || !rootB) return false;
        return rootA === rootB;
    }
}

export function createFileSystemService(config?: FileSystemServiceConfig): FileSystemService {
    return new FileSystemServiceImpl(config);
}
