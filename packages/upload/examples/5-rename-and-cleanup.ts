/**
 * 示例 5：上传前重命名图片并在成功后回收本地文件
 *
 * 功能：
 * - 上传前自动重命名图片（原名 + 时间戳 + 内容哈希）
 * - 上传并替换成功后，将本地图片移至系统回收站或指定目录
 * - 支持重试机制和失败处理
 */

import { uploadMultiImages } from "../src/index.js";
import type { UploadEvent } from "../src/types.js";

// 模拟适配器（实际使用时替换为真实适配器）
class MockAdapter {
  async upload(localPath: string, remotePath: string): Promise<string> {
    console.log(`[Mock] 上传: ${localPath} -> ${remotePath}`);
    return `https://cdn.example.com/${remotePath}`;
  }
}

async function example5() {
  console.log("=== 示例 5：上传前重命名并回收 ===\n");

  const adapter = new MockAdapter();

  // 场景 1：默认策略（使用系统回收站）
  console.log("场景 1：使用默认命名策略和系统回收站");
  const results1 = await uploadMultiImages({
    workspace: {
      projectRoot: process.cwd(),
      searchDir: "examples/demo-data/docs",
    },
    adapter,
    naming: {
      uploadPrefix: "blog/images",
      // 默认命名策略：original+timestamp+hash
      // 生成格式：logo-20260124-153045-123-a1b2c3d4.png
      namingStrategy: "original+timestamp+hash",
    },
    deletion: {
      // 默认删除策略：trash（系统回收站）
      strategy: "trash",
      // 默认最大重试次数：3
      maxRetries: 3,
    },
    replace: true,
    hooks: {
      onEvent: (event: UploadEvent) => {
      if (event.type === "upload:complete") {
        console.log(`  ✓ 上传成功：${event.data?.originalName} → ${event.data?.renamedTo}`);
      } else if (event.type === "delete:complete") {
        console.log(`  ✓ 已回收：${event.data?.localPath} (重试 ${event.data?.deletionRetries} 次)`);
      } else if (event.type === "delete:error") {
        console.log(`  ✗ 回收失败：${event.data?.localPath}`);
        console.log(`    错误：${event.data?.error?.message}`);
      }
    },
  },
  });

  console.log(`\n结果：${results1.length} 个图片\n`);

  // 场景 2：移动到指定目录（而非系统回收站）
  console.log("场景 2：移动到自定义目录 .cmtx-trash/");
  const results2 = await uploadMultiImages({
    workspace: {
      projectRoot: process.cwd(),
      searchDir: "examples/demo-data/docs",
    },
    adapter,
    naming: {
      uploadPrefix: "blog/images",
      namingStrategy: "original+timestamp+hash",
    },
    deletion: {
      strategy: "move", // 移动到指定目录
      trashDir: ".cmtx-trash/", // 自定义回收目录
      maxRetries: 3,
    },
    replace: true,
    hooks: {
      onEvent: (event: UploadEvent) => {
      if (event.type === "upload:complete") {
        console.log(`  ✓ 上传：${event.data?.originalName} → ${event.data?.renamedTo}`);
      } else if (event.type === "delete:complete") {
        console.log(`  ✓ 已移至 .cmtx-trash/：${event.data?.localPath}`);
      }
    },
  },
  });

  console.log(`\n结果：${results2.length} 个图片\n`);

  // 场景 3：自定义命名策略
  console.log("场景 3：自定义命名函数");
  const results3 = await uploadMultiImages({
    workspace: {
      projectRoot: process.cwd(),
      searchDir: "examples/demo-data/docs",
    },
    adapter,
    naming: {
      uploadPrefix: "blog/images",
      // 自定义命名函数：生成简短的时间戳名称
      namingStrategy: (localPath: string) => {
        const ext = localPath.split(".").pop();
        const timestamp = Date.now();
        return `img-${timestamp}.${ext}`;
      },
    },
    deletion: {
      strategy: "trash",
      maxRetries: 3,
    },
    replace: true,
    hooks: {
      onEvent: (event: UploadEvent) => {
      if (event.type === "upload:complete") {
        console.log(`  ✓ 自定义命名：${event.data?.originalName} → ${event.data?.renamedTo}`);
      }
    },
  },
  });

  console.log(`\n结果：${results3.length} 个图片\n`);

  // 场景 4：不删除本地文件（仅上传和替换）
  console.log("场景 4：不删除本地文件");
  const results4 = await uploadMultiImages({
    workspace: {
      projectRoot: process.cwd(),
      searchDir: "examples/demo-data/docs",
    },
    adapter,
    naming: {
      uploadPrefix: "blog/images",
      namingStrategy: "original+timestamp+hash",
    },
    replace: true,
    // 不指定 deletion，默认不删除本地文件
  });

  console.log(`\n结果：${results4.length} 个图片（本地文件已保留）\n`);

  // 查看结果详情
  console.log("\n=== 上传结果详情 ===");
  for (const result of results1) {
    console.log(`\n文件：${result.originalName}`);
    console.log(`  本地路径：${result.localPath}`);
    console.log(`  远程路径：${result.remotePath}`);
    console.log(`  CDN URL：${result.ossUrl}`);
    console.log(`  文件大小：${(result.fileSize / 1024).toFixed(2)} KB`);
    console.log(`  上传耗时：${result.uploadTime} ms`);
    console.log(`  引用替换：${result.replaceResults.length} 个文件`);
    console.log(`  删除状态：${result.deletionStatus || "skipped"}`);
    if (result.deletionRetries !== undefined) {
      console.log(`  重试次数：${result.deletionRetries}`);
    }
    if (result.deletionError) {
      console.log(`  删除错误：${result.deletionError}`);
    }
  }
}

// 运行示例
await example5();
