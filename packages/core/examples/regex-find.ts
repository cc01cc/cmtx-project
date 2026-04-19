/**
 * 示例：多组正则表达式查询功能
 * 运行：pnpm exec tsx examples/regex-find.ts
 *
 * @remarks
 * 演示 findAllMatches 函数的核心使用场景，聚焦实际应用价值。
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { findAllMatches } from '../src/multi-regex.js';

await import('./scripts/gen-demo-data.js').then((mod) => mod.main());

// 读取真实文件内容
const realFilePath = resolve('./examples/demo-data/docs/README.md');
const realFileContent = await readFile(realFilePath, 'utf-8');

console.log('=== 多组正则表达式查询功能演示 ===\n');

// 场景 1: 智能内容分析与质量检查
console.log('场景 1: 智能内容分析');
const contentAnalysis = findAllMatches(realFileContent, {
    rules: [
        // 结构化元素识别
        { pattern: /^(#{1,6})\s+(.*)$/gm, id: 'headings' },
        // 媒体资产盘点
        { pattern: /!\[[^\]]*\]\([^)]+\)|<img[^>]+>/gi, id: 'media-assets' },
        // 外部链接健康检查
        { pattern: /https?:\/\/[^\s")>]+/g, id: 'external-links' },
        // 待办事项扫描
        { pattern: /TODO|FIXME|HACK/gi, id: 'action-items' },
    ],
});

console.log('内容结构分析：');
for (const [type, stats] of Object.entries(contentAnalysis.statistics)) {
    console.log(`  ${type}: ${stats.count} 项`);
}

// 场景 2: 生产环境部署预检
console.log('\n场景 2: 生产部署预检');
const deploymentCheck = findAllMatches(realFileContent, {
    rules: [
        // 开发环境残留检查
        { pattern: /localhost|127\.0\.0\.1|test/gi, id: 'dev-artifacts' },
        // 多语言内容识别
        { pattern: /[\u4e00-\u9fff]/g, id: 'chinese-content' },
        // 相对路径检查
        { pattern: /\.\.\/(images|assets)/g, id: 'relative-paths' },
    ],
});

const issues = Object.values(deploymentCheck.statistics).reduce((sum, stat) => sum + stat.count, 0);
console.log(`发现 ${issues} 个需要注意的项目`);
if (issues > 0) {
    console.log('[建议] 请在生产部署前处理上述问题');
} else {
    console.log('[通过] 内容符合生产环境要求');
}

// 场景 3: 安全内容扫描
console.log('\n场景 3: 安全内容扫描');
const securityScan = findAllMatches(realFileContent, {
    rules: [
        { pattern: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, id: 'script-tags' },
        { pattern: /javascript:/gi, id: 'unsafe-javascript' },
        { pattern: /on\w+\s*=/gi, id: 'inline-handlers' },
    ],
});

if (securityScan.matches.length > 0) {
    console.log(`⚠️  发现 ${securityScan.matches.length} 个潜在安全风险`);
    for (const match of securityScan.matches) {
        console.log(`  - 位置 ${match.index}: ${match.matchedText.substring(0, 30)}...`);
    }
} else {
    console.log('✅ 内容安全检查通过');
}

// 场景 4: 变更影响评估
console.log('\n场景 4: 变更影响评估');
const changeImpact = findAllMatches(realFileContent, {
    rules: [
        { pattern: /\.\.\/images\/(\w+\.png)/g, id: 'image-references' },
        { pattern: /Version:\s*([\d.]+)/g, id: 'version-references' },
    ],
});

console.log('变更影响分析：');
for (const [type, stats] of Object.entries(changeImpact.statistics)) {
    if (stats.count > 0) {
        console.log(`  ${type}: 影响 ${stats.count} 处`);
        console.log(`    样本：${stats.sampleMatches.slice(0, 2).join(', ')}`);
    }
}

console.log('\n=== 演示完成 ===');
