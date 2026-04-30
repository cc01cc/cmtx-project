import { join, relative, resolve } from "node:path";
import { FileService } from "@cmtx/asset/file";
import { renderMarkdown, validateMarkdown } from "../preset/registry.js";
import type {
    RenderDirectoryOptions,
    RenderDirectoryResult,
    RenderedFileResult,
    RenderFileOptions,
    ValidateDirectoryOptions,
    ValidatedFileResult,
    ValidateFileOptions,
    ValidationSummary,
} from "../types.js";

const fileService = new FileService();

/**
 * 对单个 Markdown 文件执行平台校验。
 */
export async function validateFile(
    inputFile: string,
    options: ValidateFileOptions,
): Promise<ValidatedFileResult> {
    const fullInputPath = resolve(inputFile);
    const content = await fileService.readFileContent(fullInputPath);

    return {
        inputPath: fullInputPath,
        issues: await validateMarkdown(content, options.platform),
    };
}

/**
 * 递归校验目录中的全部 Markdown 文件。
 */
export async function validateDirectory(
    inputDir: string,
    options: ValidateDirectoryOptions,
): Promise<ValidationSummary> {
    const fullInputDir = resolve(inputDir);
    const files = await collectMarkdownFiles(fullInputDir);
    const results: ValidatedFileResult[] = [];

    for (const filePath of files) {
        const content = await fileService.readFileContent(filePath);
        const issues = await validateMarkdown(content, options.platform);
        results.push({ inputPath: filePath, issues });
    }

    return {
        files: results,
        issueCount: results.reduce((count, result) => count + result.issues.length, 0),
    };
}

/**
 * 对单个 Markdown 文件执行平台渲染。
 */
export async function renderFile(
    inputFile: string,
    options: RenderFileOptions,
): Promise<RenderedFileResult> {
    const fullInputPath = resolve(inputFile);
    const content = await fileService.readFileContent(fullInputPath);
    const result = await renderMarkdown(content, options.platform);

    let outputPath: string | undefined;
    if (!options.dryRun && options.outFile) {
        outputPath = resolve(options.outFile);
        await fileService.writeFileContent(outputPath, result.content);
    }

    return {
        ...result,
        inputPath: fullInputPath,
        outputPath,
    };
}

/**
 * 递归渲染目录中的全部 Markdown 文件。
 */
export async function renderDirectory(
    inputDir: string,
    options: RenderDirectoryOptions,
): Promise<RenderDirectoryResult> {
    if (!options.dryRun && !options.outDir) {
        throw new TypeError("Rendering a directory requires outDir when dryRun is false");
    }

    const fullInputDir = resolve(inputDir);
    const files = await collectMarkdownFiles(fullInputDir);
    const results: RenderedFileResult[] = [];

    for (const filePath of files) {
        const content = await fileService.readFileContent(filePath);
        const result = await renderMarkdown(content, options.platform);

        let outputPath: string | undefined;
        if (!options.dryRun && options.outDir) {
            const relativePath = relative(fullInputDir, filePath).replace(
                /\.md$/i,
                result.format === "html" ? ".html" : ".md",
            );
            outputPath = join(resolve(options.outDir), relativePath);
            await fileService.writeFileContent(outputPath, result.content);
        }

        results.push({
            ...result,
            inputPath: filePath,
            outputPath,
        });
    }

    return { files: results };
}

async function collectMarkdownFiles(dirPath: string): Promise<string[]> {
    return fileService.scanDirectory(dirPath, {
        patterns: ["**/*.md", "**/*.markdown"],
        ignore: ["node_modules/**", ".git/**"],
    });
}
