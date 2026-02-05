/**
 * 示例 1: 综合图片分析和路径测试
 * 运行：pnpm exec tsx examples/1-comprehensive-analysis.ts
 *
 * 如未生成示例数据，请先运行：pnpm exec tsx examples/scripts/gen-demo-data.ts
 *
 * 这个示例综合了原来 example 1 和 example 7 的功能：
 * - 从文件中筛选和分析图片
 * - 测试各种路径格式的处理能力
 * - 提供详细的统计和分类信息
 */

import { filterImagesFromFile, filterImagesInText } from '../src';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface AnalysisResult {
    fileName: string;
    localImages: any[];
    webImages: any[];
    mdImages: any[];
    htmlImages: any[];
    relativePaths: any[];
    absolutePaths: any[];
    webUrls: any[];
    complexPaths: any[];
    total: number;
}

async function analyzeFile(filePath: string, fileName: string) {
    console.log(`\n=== 分析文件：${fileName} ===`);

    try {
        // 基础图片筛选
        const localImages = await filterImagesFromFile(filePath, {
            mode: 'sourceType',
            value: 'local',
        });

        const webImages = await filterImagesFromFile(filePath, {
            mode: 'sourceType',
            value: 'web',
        });

        console.log(`本地图片：${localImages.length} 个`);
        console.log(`Web 图片：${webImages.length} 个`);

        // 详细路径分析
        const content = await readFile(filePath, 'utf-8');
        const allImages = filterImagesInText(content);

        // 按语法分类
        const mdImages = allImages.filter((img) => img.syntax === 'md');
        const htmlImages = allImages.filter((img) => img.syntax === 'html');

        console.log(`\n语法分类:`);
        console.log(`- Markdown 图片：${mdImages.length} 个`);
        console.log(`- HTML 图片：${htmlImages.length} 个`);

        // 路径类型分析
        const relativePaths = mdImages.filter(
            (img) =>
                img.src.startsWith('./') ||
                img.src.startsWith('../') ||
                (!img.src.includes(':/') && !img.src.startsWith('/') && !/^[a-zA-Z]:/.test(img.src))
        );

        const absolutePaths = mdImages.filter(
            (img) => img.src.startsWith('/') || /^[a-zA-Z]:/.test(img.src) || img.src.startsWith('\\\\')
        );

        const webUrls = mdImages.filter(
            (img) => img.src.startsWith('http://') || img.src.startsWith('https://') || img.src.startsWith('//')
        );

        console.log(`\n路径类型分析:`);
        console.log(`- 相对路径：${relativePaths.length} 个`);
        console.log(`- 绝对路径：${absolutePaths.length} 个`);
        console.log(`- Web URL: ${webUrls.length} 个`);

        // 复杂路径检测
        const complexPaths = mdImages.filter(
            (img) =>
                img.src.includes(' ') ||
                img.src.includes('@') ||
                img.src.includes('?') ||
                img.src.includes('#') ||
                img.src.includes('%')
        );

        if (complexPaths.length > 0) {
            console.log(`\n复杂路径 (${complexPaths.length} 个):`);
            complexPaths.forEach((img, index) => {
                console.log(`  ${index + 1}. ${img.alt}: ${img.src}`);
            });
        }

        return {
            fileName,
            localImages,
            webImages,
            mdImages,
            htmlImages,
            relativePaths,
            absolutePaths,
            webUrls,
            complexPaths,
            total: allImages.length,
        };
    } catch (error) {
        console.error(`分析文件 ${fileName} 失败:`, error);
        return null;
    }
}

async function main() {
    console.log('如未生成示例数据，请先运行：pnpm exec tsx examples/scripts/gen-demo-data.ts\n');

    const demoDocsDir = resolve(__dirname, 'demo-data/docs');

    // 要分析的文件列表
    const filesToAnalyze = [
        { path: resolve(demoDocsDir, 'README.md'), name: 'README.md' },
        { path: resolve(demoDocsDir, 'core-features.md'), name: 'Core Features.md' },
        { path: resolve(demoDocsDir, 'path-formats.md'), name: 'Path Formats.md' },
        { path: resolve(demoDocsDir, 'comprehensive-paths.md'), name: 'Comprehensive Paths.md' },
    ];

    const results: AnalysisResult[] = [];

    // 分析每个文件
    for (const file of filesToAnalyze) {
        const result = await analyzeFile(file.path, file.name);
        if (result) {
            results.push(result);
        }
    }

    // 输出汇总统计
    console.log('\n' + '='.repeat(50));
    console.log('综合统计汇总');
    console.log('='.repeat(50));

    const totalLocal = results.reduce((sum, r) => sum + r.localImages.length, 0);
    const totalWeb = results.reduce((sum, r) => sum + r.webImages.length, 0);
    const totalMd = results.reduce((sum, r) => sum + r.mdImages.length, 0);
    const totalHtml = results.reduce((sum, r) => sum + r.htmlImages.length, 0);
    const totalComplex = results.reduce((sum, r) => sum + r.complexPaths.length, 0);

    console.log(`\n总体统计:`);
    console.log(`- 总文件数：${results.length}`);
    console.log(`- 本地图片总数：${totalLocal}`);
    console.log(`- Web 图片总数：${totalWeb}`);
    console.log(`- Markdown 图片总数：${totalMd}`);
    console.log(`- HTML 图片总数：${totalHtml}`);
    console.log(`- 复杂路径总数：${totalComplex}`);

    console.log(`\n各文件详情:`);
    console.log(JSON.stringify(results, null, 2));

    console.log('\n分析完成！');
}

main().catch((error) => {
    console.error('执行失败：', error);
    process.exit(1);
});
