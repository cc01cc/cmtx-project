#!/usr/bin/env node

/**
 * OSS 文档上传脚本
 * 生成文档索引，然后上传所有文档到 OSS
 * 
 * 配置说明：参见 ./upload-docs.example.md
 * 环境变量：参见 ./.env.example
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';

// 从环境变量读取配置，默认值为示例
const OSS_PROFILE = process.env.OSS_PROFILE || 'cmtx';
const OSS_BUCKET = process.env.OSS_BUCKET;
const DOC_SITE_URL = process.env.DOC_SITE_URL || 'https://project.cc01cc.cn/cmtx';

console.log('');
console.log('🚀 开始上传文档到 OSS...\n');

// 生成索引页面
console.log('📖 生成文档索引...');
execSync('node scripts/generate-docs-index.js', { stdio: 'inherit' });

if (!fs.existsSync('docs-index.html')) {
    console.error('✗ 文档索引生成失败');
    process.exit(1);
}

console.log('');
console.log('📤 上传索引页面到 OSS...');
execSync(`aliyun ossutil --profile ${OSS_PROFILE} cp docs-index.html oss://${OSS_BUCKET}/cmtx/index.html`, { stdio: 'inherit' });

console.log('');
console.log('📤 上传 core 文档...');
execSync(`aliyun ossutil --profile ${OSS_PROFILE} sync packages/core/docs/api oss://${OSS_BUCKET}/cmtx/core --force --delete`, {
    stdio: 'inherit',
});

console.log('');
console.log('📤 上传 upload 文档...');
execSync(`aliyun ossutil --profile ${OSS_PROFILE} sync packages/upload/docs/api oss://${OSS_BUCKET}/cmtx/upload --force --delete`, {
    stdio: 'inherit',
});

console.log('');
console.log('✓ 所有文档上传完成！');
console.log('');
console.log('📍 访问地址：');
console.log(`主页：${DOC_SITE_URL}/`);
console.log(`Core 文档：${DOC_SITE_URL}/core/`);
console.log(`Upload 文档：${DOC_SITE_URL}/upload/`);
