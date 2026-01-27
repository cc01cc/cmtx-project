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
import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const demoRoot = path.join(__dirname, "..", "demo-data");
const assetsDir = path.join(demoRoot, "assets");
const docsDir = path.join(demoRoot, "docs");

const assetSpecs: Array<{ filename: string; size: number; description: string }> = [
  { filename: "tiny-placeholder.png", size: 1 * 1024, description: "1KB 占位 PNG" },
  { filename: "small-swatch.jpg", size: 50 * 1024, description: "50KB 占位 JPG" },
  { filename: "medium-figure.webp", size: 1 * 1024 * 1024, description: "1MB 占位 WebP" },
  { filename: "large-cover.png", size: 8 * 1024 * 1024, description: "8MB 占位 PNG" },
  { filename: "xl-hero.jpg", size: 20 * 1024 * 1024, description: "20MB 占位 JPG" },
  { filename: "xxl-banner.webp", size: 100 * 1024 * 1024, description: "100MB 占位 WebP" },
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
  chunk.write("demo-upload-placeholder\n");

  return new Promise<void>((resolve, reject) => {
    const stream = createWriteStream(filePath);
    let remaining = size;

    function writeChunk() {
      while (remaining > 0) {
        const nextSize = Math.min(remaining, chunk.length);
        const ok = stream.write(chunk.subarray(0, nextSize));
        remaining -= nextSize;
        if (!ok) {
          stream.once("drain", writeChunk);
          return;
        }
      }
      stream.end(() => resolve());
    }

    stream.on("error", reject);
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

async function generateDocs() {
  const docs = [
    {
      filename: "local-images.md",
      content: `# 本地图片示例\n\n- Tiny: ![Tiny](../assets/tiny-placeholder.png)\n- Small: ![Small](../assets/small-swatch.jpg)\n- Medium: ![Medium](../assets/medium-figure.webp)\n`,
    },
    {
      filename: "mixed-sources.md",
      content: `# 本地与外链混合\n\n本地：![Cover](../assets/large-cover.png)\n外链：![Remote](https://placehold.co/600x400?text=Hello+World)\n`,
    },
    {
      filename: "large-assets.md",
      content: `# 大文件占位\n\n- 20MB: ![XL](../assets/xl-hero.jpg)\n- 100MB: ![XXL](../assets/xxl-banner.webp)\n\n> 默认 maxFileSize 为 10MB，若需处理这些大文件，请在示例中提升 maxFileSize。\n`,
    },
  ];

  for (const doc of docs) {
    const target = path.join(docsDir, doc.filename);
    await fs.writeFile(target, doc.content, "utf8");
    console.log(`✓ 写入 Markdown: ${doc.filename}`);
  }
}

async function main() {
  console.log("清理并生成 demo-data ...\n");
  await clearAndPrepareDirs();
  await generateAssets();
  await generateDocs();
  console.log("\n完成！demo-data 已生成于 examples/demo-data");
}

try {
  await main();
} catch (err) {
  console.error("Failed to generate demo-data:", err);
  process.exit(1);
}
