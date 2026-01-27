/**
 * 示例 2: 上传单个图片
 * 
 * 此示例演示如何使用 uploadSingleImage 函数上传指定的单个本地图片。
 * 可选替换所有引用它的 Markdown 文件（需设置 replace: true）。
 *
 * 运行命令：
 *   pnpm exec tsx examples/scripts/gen-demo-data.ts
 *   pnpm exec tsx examples/2-upload-single.ts
 */

import { uploadSingleImage } from "@cmtx/upload";

// 模拟存储适配器
const mockAdapter = {
  async upload(localPath: string, remotePath: string) {
    console.log(`  [模拟上传] ${localPath} -> ${remotePath}`);
    return `https://cdn.example.com/${remotePath}`;
  },
};

async function main() {
  const imagePath = "examples/demo-data/assets/small-swatch.jpg"; // 默认指向 demo 数据

  console.log(`准备上传图片: ${imagePath}\n`);

  console.log(
    "如未生成示例数据，请先运行: pnpm exec tsx examples/scripts/gen-demo-data.ts\n",
  );

  const result = await uploadSingleImage(imagePath, {
    workspace: {
      projectRoot: process.cwd(),
      searchDir: "examples/demo-data/docs",
    },
    adapter: mockAdapter,
    naming: { uploadPrefix: "blog/images" },  // 上传到 blog/images 目录
    replace: true,  // 启用 Markdown 引用替换
    hooks: {
      onEvent: (event) => {
        console.log(`[事件] ${event.type}`, event.data || "");
      },
      logger: (level, message) => {
        console.log(`  [${level}] ${message}`);
      },
    },
  });

  console.log(`\n=== 上传完成 ===`);
  console.log(`CDN URL: ${result.ossUrl}`);
  console.log(`文件大小: ${(result.fileSize / 1024).toFixed(2)} KB`);
  console.log(`上传耗时: ${result.uploadTime} ms`);
  console.log(`替换了 ${result.replaceResults.length} 个 Markdown 文件`);

  if (result.replaceResults.length > 0) {
    console.log(`\n=== 替换详情 ===`);
    for (const file of result.replaceResults) {
      console.log(`✓ ${file.relativePath} (${file.replacements.length} 处引用)`);
    }
  }
}

try {
  await main();
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error("❌ 错误:", message);
  process.exit(1);
}
