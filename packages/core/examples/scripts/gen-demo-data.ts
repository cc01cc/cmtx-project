/**
 * 生成本地 demo 数据（占位图片 + Markdown）。
 *
 * 运行命令：
 *   pnpm exec tsx examples/scripts/gen-demo-data.ts
 *
 * 行为：
 * - 先清空 examples/demo-data
 * - 写入占位图片
 * - 从 templates 复制 Markdown 文件
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const demoRoot = path.join(__dirname, '..', 'demo-data');
const imagesDir = path.join(demoRoot, 'images');
const docsDir = path.join(demoRoot, 'docs');

const imageSpecs: Array<{ filename: string; content: string }> = [
    { filename: 'logo.png', content: 'logo-png-placeholder-data\n' },
    { filename: 'footer.png', content: 'footer-png-placeholder-data\n' },
    { filename: 'banner.png', content: 'banner-png-placeholder-data\n' },
    { filename: 'unused.png', content: 'unused-png-placeholder-data\n' },
    { filename: 'to-be-deleted-1.png', content: 'delete-me-1-placeholder-data\n' },
    { filename: 'to-be-deleted-2.png', content: 'delete-me-2-placeholder-data\n' },
];

async function clearAndPrepareDirs() {
    await fs.rm(demoRoot, { recursive: true, force: true });
    await fs.mkdir(imagesDir, { recursive: true });
    await fs.mkdir(docsDir, { recursive: true });
}

async function writeImageFile(filePath: string, content: string) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
}

async function generateImages() {
    for (const spec of imageSpecs) {
        const target = path.join(imagesDir, spec.filename);
        await writeImageFile(target, spec.content);
        console.log(`[done] ${spec.filename}`);
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

export async function main() {
    console.log('清理并生成 demo-data ...\n');
    await clearAndPrepareDirs();
    await generateImages();
    await copyMarkdownTemplates();
    console.log('\n完成！demo-data 已生成于 examples/demo-data');
}

const isDirectRun =
    process.argv[1] &&
    (process.argv[1].endsWith('gen-demo-data.ts') || process.argv[1].endsWith('gen-demo-data.js'));

if (isDirectRun) {
    main().catch((err) => {
        console.error('Failed to generate demo-data:', err);
        process.exit(1);
    });
}
