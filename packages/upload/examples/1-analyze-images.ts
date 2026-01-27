/**
 * 示例 1: 分析本地图片引用
 *
 * 运行命令：
 *   pnpm exec tsx examples/scripts/gen-demo-data.ts
 *   pnpm exec tsx examples/1-analyze-images.ts
 *
 * 演示使用 analyzeImages 扫描 Markdown，统计本地图片数量、大小和引用位置。
 * 不会实际上传，适合预览待处理资源。
 */

import { analyzeImages } from "@cmtx/upload";

async function main() {
  console.log("开始分析本地图片引用...\n");
  console.log(
    "如未生成示例数据，请先运行：pnpm exec tsx examples/scripts/gen-demo-data.ts\n",
  );

  const result = await analyzeImages({
    projectRoot: process.cwd(),
    searchDir: "examples/demo-data/docs",
    maxFileSize: 10 * 1024 * 1024, // 10MB 默认限制
    logger: (level, message, meta) => {
      console.log(`[${level.toUpperCase()}] ${message}`, meta || "");
    },
  });

  const skipped = result.skipped ?? [];

  console.log("\n=== 分析结果 ===");
  console.log(`找到 ${result.totalCount} 个本地图片`);
  console.log(`总大小：${(result.totalSize / 1024).toFixed(2)} KB`);
  console.log(`跳过：${skipped.length} 个图片\n`);

  if (result.totalCount === 0 && skipped.length === 0) {
    console.log("没有找到本地图片引用。");
    console.log(
      "请确保 examples/demo-data/docs 存在并包含引用本地图片的 Markdown 文件。",
    );
    return;
  }

  if (result.images.length > 0) {
    console.log("=== 符合条件的图片 ===\n");
    for (const img of result.images) {
      console.log(`- ${img.localPath}`);
      console.log(`  大小：${(img.fileSize / 1024).toFixed(2)} KB`);
      console.log("  被引用于：");
      for (const md of img.referencedIn) {
        console.log(`    - ${md}`);
      }
      console.log();
    }
  }

  if (skipped.length > 0) {
    console.log("=== 被跳过的图片 ===\n");
    for (const skip of skipped) {
      console.log(`- ${skip.localPath}`);
      console.log(`  原因：${skip.reason}`);
      if (skip.fileSize !== undefined) {
        console.log(`  大小：${(skip.fileSize / 1024).toFixed(2)} KB`);
      }
      if (skip.extension) {
        console.log(`  扩展名：${skip.extension}`);
      }
      console.log();
    }
  }
}

try {
  await main();
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error("❌ 错误：", message);
  process.exit(1);
}
