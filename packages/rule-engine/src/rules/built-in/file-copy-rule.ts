import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { parseFrontmatter, parseYamlFrontmatter } from "@cmtx/core";
import type { Rule, RuleContext, RuleResult } from "../rule-types.js";
import type { FileSystemService } from "../service-registry.js";
import { readSourceFile } from "../utils/read-source-file.js";
import { resolveTemplate } from "../utils/resolve-template.js";

interface FileCopyLinksConfig {
    forwardKey?: string;
    forwardValue?: string;
    backwardKey?: string;
    backwardValue?: string;
}

interface FileCopyAssetsConfig {
    mode?: "auto" | "skip" | "copy-only" | "copy-and-update";
    targetDir?: string;
}

interface FileCopyConfig {
    targetName?: string;
    assets?: FileCopyAssetsConfig;
    links?: FileCopyLinksConfig;
}

function slugFromFilename(filePath: string): string {
    const base = basename(filePath, extname(filePath));
    return base
        .replace(/[^a-zA-Z0-9\u4e00-\u9fff-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

export const fileCopyRule: Rule = {
    id: "file-copy",
    name: "写入目标文件",
    description: "写入 prototype.md + 解析 asset + 更新关联",

    async execute(context: RuleContext, config?: FileCopyConfig): Promise<RuleResult> {
        if (context.dryRun) {
            return {
                content: context.document,
                modified: false,
                messages: ["dry-run: skip file copy"],
            };
        }

        const fs = context.services?.get<FileSystemService>("filesystem");
        if (!fs) {
            throw new Error("file-copy: FileSystemService not found in context.services");
        }

        const document = context.document;
        const filePath = context.filePath;
        const targetName = config?.targetName ?? "prototype.md";

        const parsedDoc = parseFrontmatter(document);
        const fm = parsedDoc.hasFrontmatter
            ? (parseYamlFrontmatter(parsedDoc.data) as unknown as Record<string, string>)
            : {};
        const slug = fm?.slug || slugFromFilename(filePath);

        const sourceRaw = await readSourceFile(filePath);
        const parsedSource = parseFrontmatter(sourceRaw);
        const sourceFm = parsedSource.hasFrontmatter
            ? (parseYamlFrontmatter(parsedSource.data) as unknown as Record<string, string>)
            : {};

        const dirBase = resolve(dirname(filePath));
        const privateId = fm?.private_id;
        const pattern = privateId
            ? `${privateId}-${slug}`
            : `${slugFromFilename(filePath)}-${slug}`;

        const targetDir = resolve(context.input?.["to-dir"] ?? ".");
        const targetDocDir = join(targetDir, pattern);
        const targetFilePath = join(targetDocDir, targetName);

        const targetCtx = {
            rule: { target: fm, source: sourceFm },
            input: context.input ?? {},
            env: process.env,
        };

        // 1. Write the target file
        await fs.writeFile(targetFilePath, document);

        const messages: string[] = [`file-copy: written ${targetFilePath}`];

        // 2. Handle assets
        const assetsConfig = config?.assets;
        const assetsMode = assetsConfig?.mode ?? "auto";

        if (assetsMode !== "skip") {
            const isSameWs = await fs.isSameWorkspace(filePath, targetDir);
            const effectiveMode =
                assetsMode === "auto" ? (isSameWs ? "copy-and-update" : "copy-only") : assetsMode;

            const assets = await fs.scanAssets(dirname(filePath), document);
            let modifiedDoc = document;

            for (const asset of assets) {
                const assetTargetDir = join(targetDocDir, assetsConfig?.targetDir ?? "assets");
                const assetDest = join(assetTargetDir, asset.basename);
                try {
                    await fs.copyFile(asset.absolutePath, assetDest);
                    messages.push(`file-copy: copied asset ${asset.basename}`);
                } catch {
                    messages.push(`file-copy: asset not found ${asset.originalPath}`);
                    continue;
                }

                if (effectiveMode === "copy-and-update") {
                    const relPath = relative(targetDocDir, assetDest);
                    modifiedDoc = modifiedDoc.replaceAll(asset.originalPath, relPath);
                }
            }

            if (effectiveMode === "copy-and-update" && modifiedDoc !== document) {
                await fs.writeFile(targetFilePath, modifiedDoc);
                messages.push("file-copy: updated asset references in target file");
            }
        }

        // 3. Update bidirectional links
        const linksConfig = config?.links;
        if (linksConfig) {
            if (linksConfig.forwardKey && linksConfig.forwardValue) {
                const forwardValue = resolveTemplate(linksConfig.forwardValue, targetCtx);
                const forwardKey = linksConfig.forwardKey;
                const existingForward = sourceFm?.[forwardKey];
                let newForwardValue = forwardValue;
                if (existingForward) {
                    const existingArr = Array.isArray(existingForward)
                        ? existingForward
                        : [String(existingForward)];
                    if (!existingArr.includes(forwardValue)) {
                        newForwardValue = [...existingArr, forwardValue].join(", ");
                    } else {
                        newForwardValue = String(existingForward);
                    }
                }
                await fs.updateFileFrontMatter(filePath, { [forwardKey]: newForwardValue });
                messages.push(`file-copy: updated forward link ${forwardKey}=${forwardValue}`);
            }

            if (linksConfig.backwardKey && linksConfig.backwardValue) {
                const backwardValue = resolveTemplate(linksConfig.backwardValue, targetCtx);
                const backwardKey = linksConfig.backwardKey;
                const existingBackward = fm?.[backwardKey];
                let newBackwardValue = backwardValue;
                if (existingBackward) {
                    const existingArr = Array.isArray(existingBackward)
                        ? existingBackward
                        : [String(existingBackward)];
                    if (!existingArr.includes(backwardValue)) {
                        newBackwardValue = [...existingArr, backwardValue].join(", ");
                    } else {
                        newBackwardValue = String(existingBackward);
                    }
                }
                await fs.updateFileFrontMatter(targetFilePath, { [backwardKey]: newBackwardValue });
                messages.push(`file-copy: updated backward link ${backwardKey}=${backwardValue}`);
            }
        }

        return {
            content: document,
            modified: false,
            messages,
        };
    },
};
