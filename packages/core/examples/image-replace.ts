/**
 * 示例: 替换图片引用
 * 运行: pnpm exec tsx examples/image-replace.ts
 *
 */

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { replaceImagesInDirectory, replaceImagesInFile } from '../src';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
    await import('./scripts/gen-demo-data.js').then((mod) => mod.main());

    const demoDir = resolve(__dirname, 'demo-data');
    const readmePath = resolve(demoDir, 'docs/README.md');
    const multilingualPath = resolve(demoDir, 'docs/multilingual.md');

    console.log('=== 场景 1: 替换图片源 (src) ===');
    const result1 = await replaceImagesInFile(readmePath, [
        {
            field: 'src',
            pattern: '../images/logo.png',
            newSrc: 'https://cdn.example.com/new-logo.png',
        },
    ]);

    console.log(JSON.stringify(result1, null, 2));

    console.log('\n=== 场景 2: 同时替换多个字段 (Alt & Title) ===');
    const result2 = await replaceImagesInFile(readmePath, [
        {
            field: 'src',
            pattern: '../images/banner.png',
            newSrc: 'https://cdn.example.com/banner-v2.png',
            newAlt: '更新的横幅',
            newTitle: '新版横幅图片',
        },
    ]);

    console.log(JSON.stringify(result2, null, 2));

    console.log('\n=== 场景 3: 为缺失字段插入值 (Alt) ===');
    const result3 = await replaceImagesInFile(readmePath, [
        {
            field: 'src',
            pattern: './inline.png',
            newAlt: '内联图片描述',
        },
    ]);

    console.log(JSON.stringify(result3, null, 2));

    console.log('\n=== 场景 4: 使用 raw 模式精确匹配 (HTML 标签) ===');
    const result4 = await replaceImagesInFile(readmePath, [
        {
            field: 'raw',
            pattern: '<img src="./single-line.png" alt="Single Line HTML">',
            newSrc: 'https://cdn.example.com/single-line.png',
            newAlt: '单行 HTML 图片已更新',
        },
    ]);

    console.log(JSON.stringify(result4, null, 2));

    console.log('\n=== 场景 5: 批量替换多语言路径 ===');
    const result5 = await replaceImagesInFile(multilingualPath, [
        {
            field: 'src',
            pattern: 'D:\\我的文档\\图片\\照片.jpg',
            newSrc: 'https://cdn.example.com/windows-photo.jpg',
        },
        {
            field: 'src',
            pattern: './图片/标志.png',
            newSrc: './photos/logo-v2.png',
        },
    ]);

    console.log(JSON.stringify(result5, null, 2));

    console.log('\n=== 场景 6: 批量替换目录中的图片 (递归) ===');
    const result6 = await replaceImagesInDirectory(demoDir, [
        {
            field: 'src',
            pattern: '../images/footer.png',
            newSrc: 'https://cdn.example.com/global-footer.png',
        },
    ]);

    console.log(JSON.stringify(result6, null, 2));
}

main();
