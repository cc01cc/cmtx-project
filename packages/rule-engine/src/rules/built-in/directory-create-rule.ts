import { basename, dirname, extname } from "node:path";
import { parseFrontmatter, parseYamlFrontmatter } from "@cmtx/core";
import type { Rule, RuleContext, RuleResult } from "../rule-types.js";
import type { FileSystemService } from "../service-registry.js";
import { readSourceFile } from "../utils/read-source-file.js";
import { resolveTemplate } from "../utils/resolve-template.js";

interface DirectoryCreateConfig {
    pattern?: string;
    baseDir?: string;
}

export const directoryCreateRule: Rule = {
    id: "directory-create",
    name: "创建目标目录",
    description: "创建 base-dir/{private_id}-{slug}/ 目录",

    async execute(context: RuleContext, config?: DirectoryCreateConfig): Promise<RuleResult> {
        if (context.dryRun) {
            return {
                content: context.document,
                modified: false,
                messages: ["dry-run: skip directory creation"],
            };
        }

        const fs = context.services?.get<FileSystemService>("filesystem");
        if (!fs) {
            throw new Error("directory-create: FileSystemService not found in context.services");
        }

        const parsedDoc = parseFrontmatter(context.document);
        const fm = parsedDoc.hasFrontmatter
            ? (parseYamlFrontmatter(parsedDoc.data) as unknown as Record<string, string>)
            : {};
        const sourceRaw = await readSourceFile(context.filePath);
        const parsedSource = parseFrontmatter(sourceRaw);
        const sourceId = parsedSource.hasFrontmatter
            ? (parseYamlFrontmatter(parsedSource.data) as unknown as Record<string, string>)
            : {};

        const targetCtx = {
            rule: { target: fm, source: sourceId },
            input: context.input ?? {},
            env: process.env,
        };

        const pattern = resolveTemplate(
            config?.pattern ?? "${rule.target.private_id}-${rule.target.slug}",
            targetCtx,
        );
        if (!pattern || pattern.includes("undefined")) {
            throw new Error("directory-create: cannot resolve pattern, missing private_id or slug");
        }

        const baseDir = resolveTemplate(config?.baseDir ?? "", targetCtx);
        const dirPath = baseDir ? `${baseDir}/${pattern}` : pattern;

        await fs.createDirectory(dirPath);

        return {
            content: context.document,
            modified: false,
            messages: [`directory-create: created ${dirPath}`],
        };
    },
};
