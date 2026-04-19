/**
 * 示例: 多组正则表达式替换功能 (精简实用版)
 * 运行: pnpm exec tsx examples/regex-replace.ts
 *
 * @remarks
 * 基于真实文件场景，展示核心功能和实际应用价值。
 */

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { replaceWithMultipleRegex } from '../src/multi-regex.js';

await import('./scripts/gen-demo-data.js').then((mod) => mod.main());

console.log('=== 多组正则表达式替换功能演示 ===\n');

// 场景1: 文档现代化改造
console.log('场景1: 文档现代化改造');

// 读取真实文件
const readmePath = resolve('./examples/demo-data/docs/README.md');
const originalContent = await readFile(readmePath, 'utf-8');

console.log('处理前文档摘要:');
console.log(`${originalContent.substring(0, 200)}...\n`);

const result1 = replaceWithMultipleRegex(originalContent, {
    rules: [
        // 更新项目标识
        {
            id: 'project-branding',
            pattern: /^#\s+Demo Project/m,
            replacement: '# CMTX Core Library',
            order: 1,
        },
        // 统一图片格式
        {
            id: 'image-format-unification',
            pattern: /(\.png|\.jpg|\.jpeg)/gi,
            replacement: '.webp',
            order: 2,
        },
        // 更新CDN地址
        {
            id: 'cdn-migration',
            pattern: /https:\/\/example\.com\//g,
            replacement: 'https://cdn.cmtx.dev/',
            order: 3,
        },
        // 添加版本信息
        {
            id: 'version-stamping',
            pattern: /(This is a demo project for testing image extraction\.)/,
            replacement: '$1\n\n> Version: 2.0.0 | Updated: December 2024',
            order: 4,
        },
    ],
});

console.log('替换结果预览 (JSON):');
console.log(JSON.stringify(result1, null, 2));

// 将结果写回文件
await writeFile(readmePath, result1.newText, 'utf-8');
console.log(`\n[OK] 替换结果已写回: ${readmePath}`);

// 场景2: 批量配置文件更新
console.log('\n\n场景2: 批量配置更新');

const configTemplate = `
{
  "appName": "MyApp",
  "version": "1.0.0",
  "apiEndpoint": "http://localhost:3000",
  "assetsPath": "./assets/images/",
  "features": {
    "imageProcessing": true,
    "markdownSupport": true
  }
}
`;

const configUpdateResult = replaceWithMultipleRegex(configTemplate, {
    rules: [
        // 生产环境配置
        {
            id: 'production-config',
            pattern: /"version":\s*"([^"]+)"/,
            replacement: '"version": "2.0.0"',
            order: 1,
        },
        {
            id: 'api-endpoint',
            pattern: /"apiEndpoint":\s*"([^"]+)"/,
            replacement: '"apiEndpoint": "https://api.production.com"',
            order: 2,
        },
        {
            id: 'asset-path',
            pattern: /"assetsPath":\s*"([^"]+)"/,
            replacement: '"assetsPath": "https://cdn.example.com/assets/"',
            order: 3,
        },
    ],
});

console.log('配置更新结果:');
console.log(configUpdateResult.newText);

// 场景3: 代码重构助手
console.log('\n\n场景3: 代码重构助手');

const legacyCode = `
function processData(data) {
  if (data.type === 'user') {
    return transformUserData(data.payload);
  } else if (data.type === 'product') {
    return transformProductData(data.payload);
  } else {
    return data.payload;
  }
}
`;

const refactoredCode = replaceWithMultipleRegex(legacyCode, {
    rules: [
        {
            id: 'modern-syntax',
            pattern: /function\s+(\w+)\s*\(([^)]*)\)\s*{/g,
            replacement: 'const $1 = ($2) => {',
            order: 1,
        },
        {
            id: 'switch-statement',
            pattern: /if\s*\(([^)]+)\s*===\s*'([^']+)'\)\s*{\s*return\s+([^;]+);\s*}\s*else if/g,
            replacement: "switch ($1) {\n    case '$2': return $3;\n    case",
            order: 2,
        },
    ],
});

console.log('代码重构示例:');
console.log('原始代码:');
console.log(legacyCode);
console.log('重构后:');
console.log(refactoredCode.newText);

console.log('\n=== 演示完成 ===');
