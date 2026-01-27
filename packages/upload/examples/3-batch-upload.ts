/**
 * 示例 3: 批量上传所有本地图片
 * 
 * 此示例演示如何使用 uploadMultiImages 函数一次性上传
 * 项目中所有的本地图片。可选替换 Markdown 引用（需设置 replace: true）。
 *
 * 运行命令：
 *   pnpm exec tsx examples/scripts/gen-demo-data.ts
 *   pnpm exec tsx examples/3-batch-upload.ts
 */

import { uploadMultiImages, type UploadEvent } from "@cmtx/upload";

// 模拟存储适配器
const mockAdapter = {
  async upload(localPath: string, remotePath: string) {
    // 模拟上传延迟
    await new Promise((resolve) => setTimeout(resolve, 100));
    return `https://cdn.example.com/${remotePath}`;
  },
};

// 进度追踪
let uploadedCount = 0;
let totalCount = 0;

function handleEvent(event: UploadEvent) {
  switch (event.type) {
    case "scan:start":
      console.log("🔍 开始扫描 Markdown 文件...");
      break;

    case "scan:complete":
      totalCount = event.data?.scannedCount || 0;
      console.log(`✓ 扫描完成，找到 ${totalCount} 个本地图片\n`);
      break;

    case "upload:start":
      console.log(`[upload ${uploadedCount + 1}/${totalCount}] ${event.data?.localPath}`);
      break;

    case "upload:complete":
      uploadedCount++;
      console.log(`[done] ${event.data?.ossUrl}\n`);
      break;

    case "upload:error":
      console.error(`[error] ${event.data?.localPath}`);
      console.error(`        ${event.data?.error?.message || "unknown error"}\n`);
      break;

    case "complete":
      console.log(`\n全部完成，成功上传 ${event.data?.uploadedCount} 个文件`);
      break;
  }
}

async function run() {
  console.log("=== 批量上传本地图片 ===\n");

  console.log(
    "如未生成示例数据，请先运行: pnpm exec tsx examples/scripts/gen-demo-data.ts\n",
  );

  const results = await uploadMultiImages({
    workspace: {
      projectRoot: process.cwd(),
      searchDir: "examples/demo-data/docs",
    },
    adapter: mockAdapter,
    naming: { uploadPrefix: "blog/images" },
    maxFileSize: 10 * 1024 * 1024,  // 10MB 限制
    allowedExtensions: [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"],
    replace: true,  // 启用 Markdown 引用替换
    hooks: {
      onEvent: handleEvent,
      logger: (level, message, meta) => {
        if (level === "error") {
          console.error(`[ERROR] ${message}`, meta || "");
        }
      },
    },
  });

  console.log(`\n=== 上传统计 ===`);
  console.log(`成功: ${results.length} 个文件`);

  const totalSize = results.reduce((sum, r) => sum + r.fileSize, 0);
  console.log(`总大小: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

  const totalReplaced = results.reduce((sum, r) => sum + r.replaceResults.length, 0);
  console.log(`替换: ${totalReplaced} 个 Markdown 文件`);
}

try {
  await run();
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error("\n错误:", message);
  process.exit(1);
}
