/**
 * 示例 5: 替换图片引用
 * 运行：pnpm exec tsx examples/5-replace-image.ts
 *
 * 如未生成示例数据，请先运行：pnpm exec tsx examples/scripts/gen-demo-data.ts
 */

import { replaceImagesInFile } from '../src';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
    console.log('如未生成示例数据，请先运行：pnpm exec tsx examples/scripts/gen-demo-data.ts\n');

    const coreFeaturesPath = resolve(__dirname, 'demo-data/docs/core-features.md');
    const readmePath = resolve(__dirname, 'demo-data/docs/README.md');

    console.log('=== 场景 1: 替换图片源 (src) ===');
    const result1 = await replaceImagesInFile(coreFeaturesPath, [
        { field: 'src', pattern: '../images/logo.png', newSrc: 'https://cdn.example.com/new-logo.png' },
    ]);

    console.log(`状态：${result1.success ? '成功' : '失败'}`);
    if (result1.result) {
        console.log(`替换数量: ${result1.result.replacements.length}`);
    }

    console.log('\n=== 场景 2: 同时替换多个字段 ===');
    const result2 = await replaceImagesInFile(coreFeaturesPath, [
        { 
            field: 'src', 
            pattern: '../images/banner.png', 
            newSrc: 'https://cdn.example.com/banner-v2.png',
            newAlt: '更新的横幅',
            newTitle: '新版横幅图片'
        },
    ]);

    console.log(`状态：${result2.success ? '成功' : '失败'}`);
    if (result2.result) {
        console.log(`替换数量: ${result2.result.replacements.length}`);
    }

    console.log('\n=== 场景 3: 为缺失字段插入值 ===');
    const result3 = await replaceImagesInFile(readmePath, [
        { 
            field: 'src', 
            pattern: './inline.png', 
            newAlt: '内联图片描述' 
        },
    ]);

    console.log(`状态：${result3.success ? '成功' : '失败'}`);
    if (result3.result) {
        console.log(`替换数量: ${result3.result.replacements.length}`);
    }

    console.log('\n=== 场景 4: 使用 raw 模式精确匹配 ===');
    const result4 = await replaceImagesInFile(readmePath, [
        { 
            field: 'raw', 
            pattern: '![](./single-line.png)', 
            newSrc: 'https://cdn.example.com/single-line.png',
            newAlt: '单行HTML图片'
        },
    ]);

    console.log(`状态：${result4.success ? '成功' : '失败'}`);
    if (result4.result) {
        console.log(`替换数量: ${result4.result.replacements.length}`);
    }

    console.log('\n=== 场景 5: 批量替换多个规则 ===');
    const result5 = await replaceImagesInFile(coreFeaturesPath, [
        { field: 'src', pattern: '../images/logo.png', newSrc: './updated-logo.png' },
        { field: 'src', pattern: '../images/banner.png', newSrc: './updated-banner.png' },
    ]);

    console.log(`状态：${result5.success ? '成功' : '失败'}`);
    if (result5.result) {
        console.log(`替换数量: ${result5.result.replacements.length}`);
    }

    console.log(
        JSON.stringify(
            {
                scenario1: result1,
                scenario2: result2,
                scenario3: result3,
                scenario4: result4,
                scenario5: result5,
            },
            null,
            2
        )
    );
}

await main();
