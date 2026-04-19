import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { renderMarkdown, validateMarkdown } from '../platform/registry.js';
import { applyAdaptRules } from '../rules/apply.js';
import type {
    AdaptDirectoryOptions,
    AdaptDirectoryResult,
    AdaptedFileResult,
    AdaptFileOptions,
    RenderDirectoryOptions,
    RenderDirectoryResult,
    RenderedFileResult,
    RenderFileOptions,
    ValidateDirectoryOptions,
    ValidatedFileResult,
    ValidateFileOptions,
    ValidationSummary,
} from '../types.js';

/**
 * 对单个 Markdown 文件执行适配。
 */
export async function adaptFile(
    inputFile: string,
    options: AdaptFileOptions
): Promise<AdaptedFileResult> {
    const fullInputPath = resolve(inputFile);
    const content = await readFile(fullInputPath, 'utf-8');
    const result = applyAdaptRules(content, options.rules);

    let outputPath: string | undefined;
    if (!options.dryRun && options.outFile) {
        outputPath = resolve(options.outFile);
        await mkdir(dirname(outputPath), { recursive: true });
        await writeFile(outputPath, result.content, 'utf-8');
    }

    return {
        ...result,
        inputPath: fullInputPath,
        outputPath,
    };
}

/**
 * 递归处理目录中的全部 Markdown 文件。
 */
export async function adaptDirectory(
    inputDir: string,
    options: AdaptDirectoryOptions
): Promise<AdaptDirectoryResult> {
    if (!options.dryRun && !options.outDir) {
        throw new TypeError('Processing a directory requires outDir when dryRun is false');
    }

    const fullInputDir = resolve(inputDir);
    const files = await collectMarkdownFiles(fullInputDir);
    const results: AdaptedFileResult[] = [];

    for (const filePath of files) {
        const content = await readFile(filePath, 'utf-8');
        const result = applyAdaptRules(content, options.rules);

        let outputPath: string | undefined;
        if (!options.dryRun && options.outDir) {
            const relativePath = relative(fullInputDir, filePath);
            outputPath = join(resolve(options.outDir), relativePath);
            await mkdir(dirname(outputPath), { recursive: true });
            await writeFile(outputPath, result.content, 'utf-8');
        }

        results.push({
            ...result,
            inputPath: filePath,
            outputPath,
        });
    }

    return { files: results };
}

/**
 * 对单个 Markdown 文件执行平台校验。
 */
export async function validateFile(
    inputFile: string,
    options: ValidateFileOptions
): Promise<ValidatedFileResult> {
    const fullInputPath = resolve(inputFile);
    const content = await readFile(fullInputPath, 'utf-8');

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
    options: ValidateDirectoryOptions
): Promise<ValidationSummary> {
    const fullInputDir = resolve(inputDir);
    const files = await collectMarkdownFiles(fullInputDir);
    const results: ValidatedFileResult[] = [];

    for (const filePath of files) {
        const content = await readFile(filePath, 'utf-8');
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
    options: RenderFileOptions
): Promise<RenderedFileResult> {
    const fullInputPath = resolve(inputFile);
    const content = await readFile(fullInputPath, 'utf-8');
    const result = await renderMarkdown(content, options.platform);

    let outputPath: string | undefined;
    if (!options.dryRun && options.outFile) {
        outputPath = resolve(options.outFile);
        await mkdir(dirname(outputPath), { recursive: true });
        await writeFile(outputPath, result.content, 'utf-8');
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
    options: RenderDirectoryOptions
): Promise<RenderDirectoryResult> {
    if (!options.dryRun && !options.outDir) {
        throw new TypeError('Rendering a directory requires outDir when dryRun is false');
    }

    const fullInputDir = resolve(inputDir);
    const files = await collectMarkdownFiles(fullInputDir);
    const results: RenderedFileResult[] = [];

    for (const filePath of files) {
        const content = await readFile(filePath, 'utf-8');
        const result = await renderMarkdown(content, options.platform);

        let outputPath: string | undefined;
        if (!options.dryRun && options.outDir) {
            const relativePath = relative(fullInputDir, filePath).replace(
                /\.md$/i,
                result.format === 'html' ? '.html' : '.md'
            );
            outputPath = join(resolve(options.outDir), relativePath);
            await mkdir(dirname(outputPath), { recursive: true });
            await writeFile(outputPath, result.content, 'utf-8');
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
    const entries = await readdir(dirPath, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);

        if (entry.isDirectory()) {
            files.push(...(await collectMarkdownFiles(fullPath)));
            continue;
        }

        if (entry.isFile() && extname(entry.name).toLowerCase() === '.md') {
            files.push(fullPath);
        }
    }

    return files;
}
