import chalk from "chalk";
import type { OutputFormat } from "../types/cli.js";
import type { ImageEntry, LocalImageEntry, DirectoryAnalysis } from "@cmtx/asset/file";

export function formatAnalyzeResult(
    analysis: DirectoryAnalysis,
    format: OutputFormat = "table",
): string {
    switch (format) {
        case "json":
            return formatAnalyzeJSON(analysis);
        case "table":
            return formatAnalyzeTable(analysis);
        case "plain":
            return formatAnalyzePlain(analysis);
    }
}

function isLocal(entry: ImageEntry): entry is LocalImageEntry {
    return entry.type === "local";
}

function formatAnalyzeJSON(analysis: DirectoryAnalysis): string {
    const totalReferences = analysis.images.reduce((sum, img) => sum + img.referencedBy.length, 0);
    return JSON.stringify(
        {
            success: true,
            timestamp: new Date().toISOString(),
            result: {
                summary: {
                    total: analysis.images.length,
                    referenced: analysis.summary.referenced,
                    orphan: analysis.summary.orphan,
                    totalSize: analysis.summary.totalSize,
                    totalReferences,
                    mdFiles: analysis.summary.mdFiles,
                },
                images: analysis.images,
            },
        },
        null,
        2,
    );
}

function formatAnalyzeTable(analysis: DirectoryAnalysis): string {
    const lines: string[] = [];
    const totalReferences = analysis.images.reduce((sum, img) => sum + img.referencedBy.length, 0);

    lines.push("Analyze Result");
    lines.push("");

    if (analysis.images.length > 0) {
        const header = `  ${"Image".padEnd(30)} ${"Size".padStart(10)} ${"Refs".padStart(6)} ${"Files".padStart(6)}  Status`;
        const sep = `  ${"-".repeat(30)} ${"-".repeat(10)} ${"-".repeat(6)} ${"-".repeat(6)}  ${"-".repeat(8)}`;
        lines.push(header);
        lines.push(sep);
        for (const entry of analysis.images) {
            const sizeStr =
                isLocal(entry) && entry.fileSize > 0
                    ? `${(entry.fileSize / 1024).toFixed(1)} KB`
                    : "-";
            const uniqueFiles = new Set(entry.referencedBy).size;
            const status = isLocal(entry) && entry.orphan ? "[orphan]" : "";
            lines.push(
                `  ${entry.src.padEnd(30)} ${sizeStr.padStart(10)} ${String(entry.referencedBy.length).padStart(6)} ${String(uniqueFiles).padStart(6)}  ${status.padEnd(8)}`,
            );
        }
    }

    lines.push("");
    lines.push(
        `Summary: ${analysis.summary.referenced} referenced, ${analysis.summary.orphan} orphan, ` +
            `${(analysis.summary.totalSize / 1024).toFixed(1)} KB total, ${totalReferences} references, ` +
            `${analysis.summary.mdFiles} md files`,
    );

    const withRefs = analysis.images.filter((i) => !isLocal(i) || !i.orphan);
    if (withRefs.length > 0) {
        lines.push("");
        lines.push("Reference Details:");
        for (const entry of withRefs) {
            const refCount = new Map<string, number>();
            for (const fp of entry.referencedBy) {
                refCount.set(fp, (refCount.get(fp) ?? 0) + 1);
            }
            lines.push(`  ${entry.src}`);
            for (const [filePath, count] of refCount) {
                lines.push(`    ${filePath}  (${count})`);
            }
        }
    }

    const orphans = analysis.images.filter((i) => isLocal(i) && i.orphan);
    if (orphans.length > 0) {
        lines.push("");
        lines.push("Orphan Images:");
        for (const entry of orphans) {
            lines.push(`  ${entry.src}  [orphan]`);
        }
    }

    return lines.join("\n");
}

function formatAnalyzePlain(analysis: DirectoryAnalysis): string {
    const totalReferences = analysis.images.reduce((sum, img) => sum + img.referencedBy.length, 0);
    const lines: string[] = [
        `[ANALYZE] ${analysis.summary.referenced} referenced, ${analysis.summary.orphan} orphan, ` +
            `${analysis.summary.totalSize} bytes, ${totalReferences} references, ${analysis.summary.mdFiles} md files`,
    ];

    if (analysis.images.length > 0) {
        lines.push("");
        lines.push("images:");
        for (const entry of analysis.images) {
            const uniqueFiles = new Set(entry.referencedBy).size;
            const sizeStr = isLocal(entry) && entry.fileSize > 0 ? `${entry.fileSize} bytes` : "-";
            const orphanTag = isLocal(entry) && entry.orphan ? " [orphan]" : "";
            lines.push(
                `  ${entry.src}${orphanTag} (${sizeStr}, ${entry.referencedBy.length} refs, ${uniqueFiles} files)`,
            );
            if (isLocal(entry) && !entry.orphan && entry.referencedBy.length > 0) {
                const refCount = new Map<string, number>();
                for (const fp of entry.referencedBy) {
                    refCount.set(fp, (refCount.get(fp) ?? 0) + 1);
                }
                for (const [filePath, count] of refCount) {
                    lines.push(`    ${filePath}  (${count})`);
                }
            }
        }
    }

    return lines.join("\n");
}

export function formatUploadPreview(
    preview: { imagePath: string; remotePath: string }[],
    willReplace: number,
    willDelete: number,
    format: OutputFormat = "table",
): string {
    switch (format) {
        case "json":
            return JSON.stringify(
                {
                    success: true,
                    dryRun: true,
                    timestamp: new Date().toISOString(),
                    preview: {
                        uploads: preview,
                        willReplaceInFiles: willReplace,
                        willDeleteFiles: willDelete,
                    },
                },
                null,
                2,
            );
        case "table":
            return formatPreviewTable(preview, willReplace, willDelete);
        case "plain":
            return formatPreviewPlain(preview, willReplace, willDelete);
    }
}

function formatPreviewTable(
    preview: { imagePath: string; remotePath: string }[],
    willReplace: number,
    willDelete: number,
): string {
    let output = chalk.bold("\nUpload Preview (dry-run)\n");

    output += chalk.cyan("Files to upload:\n");
    for (const item of preview) {
        output += chalk.dim(`  ${item.imagePath} -> ${item.remotePath}\n`);
    }

    output += chalk.bold("\nExpected operations:\n");
    output += chalk.dim(`  Replace references in ${willReplace} files\n`);
    output += chalk.dim(`  Delete ${willDelete} local files\n`);
    output += chalk.yellow("\nThis is a preview, no changes were made.\n");

    return output;
}

function formatPreviewPlain(
    preview: { imagePath: string; remotePath: string }[],
    willReplace: number,
    willDelete: number,
): string {
    const lines: string[] = [
        "[DRY-RUN] Upload Preview",
        `[Upload] ${preview.length} files`,
        `[Replace] ${willReplace} files`,
        `[Delete] ${willDelete} local files`,
    ];

    for (const item of preview) {
        lines.push(`  ${item.imagePath} -> ${item.remotePath}`);
    }

    return lines.join("\n");
}

export function formatError(error: Error | string): string {
    const message = typeof error === "string" ? error : error.message;
    return chalk.red(`ERROR: ${message}`);
}

export function formatSuccess(message: string): string {
    return chalk.green(`OK: ${message}`);
}

export function formatWarning(message: string): string {
    return chalk.yellow(`WARN: ${message}`);
}

export function formatInfo(message: string): string {
    return chalk.blue(`INFO: ${message}`);
}
