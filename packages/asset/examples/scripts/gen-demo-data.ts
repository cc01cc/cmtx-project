import { createWriteStream } from 'node:fs';
/**
 * 生成本地 demo 数据（占位图片 + Markdown）。
 *
 * 运行命令：
 *   pnpm exec tsx examples/scripts/gen-demo-data.ts
 *
 * 行为：
 * - 先清空 examples/demo-data
 * - 写入多尺寸占位图（png/jpg/webp，1KB 至 100MB）
 * - 写入引用这些图片的 Markdown
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const demoRoot = path.join(__dirname, '..', 'demo-data');
const assetsDir = path.join(demoRoot, 'assets');
const docsDir = path.join(demoRoot, 'docs');

const assetSpecs: Array<{ filename: string; size: number; description: string }> = [
    { filename: 'tiny-placeholder.png', size: 1 * 1024, description: '1KB 占位 PNG' },
    { filename: 'small-swatch.jpg', size: 50 * 1024, description: '50KB 占位 JPG' },
    { filename: 'medium-figure.webp', size: 1 * 1024 * 1024, description: '1MB 占位 WebP' },
    { filename: 'large-cover.png', size: 8 * 1024 * 1024, description: '8MB 占位 PNG' },
    { filename: 'xl-hero.jpg', size: 20 * 1024 * 1024, description: '20MB 占位 JPG' },
    { filename: 'xxl-banner.webp', size: 100 * 1024 * 1024, description: '100MB 占位 WebP' },
];

async function clearAndPrepareDirs() {
    await fs.rm(demoRoot, { recursive: true, force: true });
    await fs.mkdir(assetsDir, { recursive: true });
    await fs.mkdir(docsDir, { recursive: true });
}

async function writeSizedFile(filePath: string, size: number) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    const maxChunk = 1024 * 1024; // 1MB chunk to avoid large buffers in memory
    const chunk = Buffer.alloc(Math.min(size, maxChunk), 0);
    chunk.write('demo-upload-placeholder\n');

    return new Promise<void>((resolve, reject) => {
        const stream = createWriteStream(filePath);
        let remaining = size;

        function writeChunk() {
            while (remaining > 0) {
                const nextSize = Math.min(remaining, chunk.length);
                const ok = stream.write(chunk.subarray(0, nextSize));
                remaining -= nextSize;
                if (!ok) {
                    stream.once('drain', writeChunk);
                    return;
                }
            }
            stream.end(() => resolve());
        }

        stream.on('error', reject);
        writeChunk();
    });
}

async function generateAssets() {
    for (const spec of assetSpecs) {
        const target = path.join(assetsDir, spec.filename);
        await writeSizedFile(target, spec.size);
        console.log(`[done] ${spec.filename} (${Math.round(spec.size / 1024)} KB)`);
    }
}

async function copyMarkdownTemplates() {
    const templatesDir = path.join(__dirname, 'markdown-templates');

    try {
        const files = await fs.readdir(templatesDir);

        for (const file of files) {
            if (file.endsWith('.md')) {
                const sourcePath = path.join(templatesDir, file);
                const targetPath = path.join(docsDir, file);

                await fs.copyFile(sourcePath, targetPath);
                console.log(`✓ 复制 Markdown: ${file}`);
            }
        }
    } catch (error) {
        console.error('❌ 复制 Markdown 模板失败：', error);
        throw error;
    }
}

async function main() {
    console.log('清理并生成 demo-data ...\n');
    await clearAndPrepareDirs();
    await generateAssets();
    await copyMarkdownTemplates();
    console.log('\n完成！demo-data 已生成于 examples/demo-data');
}

try {
    await main();
} catch (err) {
    console.error('Failed to generate demo-data:', err);
    process.exit(1);
}
