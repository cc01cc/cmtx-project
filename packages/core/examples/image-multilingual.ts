/**
 * 示例: 多语言路径测试
 * 运行: pnpm exec tsx examples/image-multilingual.ts
 *
 * @remarks
 * 测试系统对多语言路径的处理能力，
 * 包括中文、日文、韩文等各种语言的路径支持。
 */

import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { filterImagesFromFile, filterImagesInText } from '../src';

await import('./scripts/gen-demo-data.js').then((mod) => mod.main());
const __dirname = dirname(fileURLToPath(import.meta.url));

interface MultilingualTestResult {
    language: string;
    totalImages: number;
    localImages: number;
    webImages: number;
    mdImages: number;
    htmlImages: number;
    unicodePaths: string[];
}

async function testMultilingualFile(fileName: string): Promise<MultilingualTestResult | null> {
    console.log(`\n=== 测试文件: ${fileName} ===`);

    try {
        const filePath = resolve(__dirname, 'demo-data/docs', fileName);
        const content = await readFile(filePath, 'utf-8');

        // 基础筛选
        const localImages = await filterImagesFromFile(filePath, {
            mode: 'sourceType',
            value: 'local',
        });

        const webImages = await filterImagesFromFile(filePath, {
            mode: 'sourceType',
            value: 'web',
        });

        // 语法分析
        const allImages = filterImagesInText(content);
        const mdImages = allImages.filter((img) => img.syntax === 'md');
        const htmlImages = allImages.filter((img) => img.syntax === 'html');

        // Unicode路径检测
        const unicodePaths = mdImages
            .filter((img) => /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(img.src))
            .map((img) => img.src);

        const result: MultilingualTestResult = {
            language: fileName,
            totalImages: allImages.length,
            localImages: localImages.length,
            webImages: webImages.length,
            mdImages: mdImages.length,
            htmlImages: htmlImages.length,
            unicodePaths,
        };

        console.log(`总计图片: ${result.totalImages}`);
        console.log(`本地图片: ${result.localImages}`);
        console.log(`Web图片: ${result.webImages}`);
        console.log(`Markdown语法: ${result.mdImages}`);
        console.log(`HTML语法: ${result.htmlImages}`);

        if (unicodePaths.length > 0) {
            console.log(`\n检测到Unicode路径 (${unicodePaths.length} 个):`);
            unicodePaths.forEach((path, index) => {
                console.log(`  ${index + 1}. ${path}`);
            });
        }

        return result;
    } catch (error) {
        console.error(`测试文件 ${fileName} 失败:`, error);
        return null;
    }
}

async function _detectLanguageByContent(content: string): Promise<string[]> {
    const languages: string[] = [];

    // 中文检测
    if (/[\u4e00-\u9fff]/.test(content)) {
        languages.push('中文');
    }

    // 日文检测
    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(content)) {
        languages.push('日文');
    }

    // 韩文检测
    if (/[\uac00-\ud7af]/.test(content)) {
        languages.push('韩文');
    }

    // 英文检测
    if (/[a-zA-Z]/.test(content)) {
        languages.push('英文');
    }

    return languages;
}

async function main() {
    console.log('多语言路径处理能力测试');
    console.log('='.repeat(40));

    const testFiles = ['multilingual.md', 'README.md', 'core-features.md', 'path-formats.md'];

    const results: MultilingualTestResult[] = [];

    for (const fileName of testFiles) {
        const result = await testMultilingualFile(fileName);
        if (result) {
            results.push(result);
        }
    }

    // 综合统计
    console.log(`\n${'='.repeat(50)}`);
    console.log('多语言测试综合报告');
    console.log('='.repeat(50));

    const totalImages = results.reduce((sum, r) => sum + r.totalImages, 0);
    const totalLocal = results.reduce((sum, r) => sum + r.localImages, 0);
    const totalWeb = results.reduce((sum, r) => sum + r.webImages, 0);
    const totalUnicode = results.reduce((sum, r) => sum + r.unicodePaths.length, 0);

    console.log('\n总体统计:');
    console.log(`- 测试文件数: ${results.length}`);
    console.log(`- 图片总数: ${totalImages}`);
    console.log(`- 本地图片: ${totalLocal}`);
    console.log(`- Web图片: ${totalWeb}`);
    console.log(`- Unicode路径: ${totalUnicode}`);

    console.log('\n各文件详情:');
    results.forEach((result) => {
        console.log(`\n${result.language}:`);
        console.log(`  图片总数: ${result.totalImages}`);
        console.log(`  本地: ${result.localImages}, Web: ${result.webImages}`);
        console.log(`  MD: ${result.mdImages}, HTML: ${result.htmlImages}`);
        console.log(`  Unicode路径: ${result.unicodePaths.length}`);
    });

    // 语言覆盖测试
    console.log('\n语言支持测试:');
    const languageSupport = {
        chinese: results.some((r) => r.unicodePaths.some((p) => /[\u4e00-\u9fff]/.test(p))),
        japanese: results.some((r) =>
            r.unicodePaths.some((p) => /[\u3040-\u309f\u30a0-\u30ff]/.test(p))
        ),
        korean: results.some((r) => r.unicodePaths.some((p) => /[\uac00-\ud7af]/.test(p))),
    };

    console.log(`- 中文支持: ${languageSupport.chinese ? '✓' : '✗'}`);
    console.log(`- 日文支持: ${languageSupport.japanese ? '✓' : '✗'}`);
    console.log(`- 韩文支持: ${languageSupport.korean ? '✓' : '✗'}`);

    console.log(
        `\n测试完成！系统${languageSupport.chinese && languageSupport.japanese && languageSupport.korean ? '完全' : '部分'}支持多语言路径处理。`
    );
}

await main().catch((error) => {
    console.error('执行失败:', error);
    process.exit(1);
});
