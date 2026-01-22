/**
 * 示例 4: 安全删除图片(检查引用后删除)
 * 运行: pnpm exec tsx examples/4-safe-delete.ts
 * 
 * 这个示例会在操作前备份文件,操作后恢复,确保非幂等操作不会破坏演示环境
 */

import { safeDeleteLocalImage } from "../src";
import { writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";

// 备份和恢复演示数据的工具函数
async function backupFiles(paths: string[]): Promise<Map<string, Buffer | null>> {
  const backup = new Map<string, Buffer | null>();
  for (const path of paths) {
    try {
      if (existsSync(path)) {
        backup.set(path, await readFile(path));
      } else {
        backup.set(path, null);
      }
    } catch {
      backup.set(path, null);
    }
  }
  return backup;
}

async function restoreFiles(backup: Map<string, Buffer | null>): Promise<void> {
  for (const [path, content] of backup.entries()) {
    if (content !== null) {
      await writeFile(path, content);
    }
  }
}

async function main() {
  const demoDir = "examples/demo-data";
  const unusedImagePath = `${demoDir}/images/unused.png`;
  
  // 备份演示文件
  const backup = await backupFiles([unusedImagePath]);
  
  // 确保测试文件存在（以支持重复运行）
  if (!existsSync(unusedImagePath)) {
    await writeFile(unusedImagePath, "fake png data");
    console.log("✓ 已创建测试文件 unused.png");
  }

  try {
    // 配置选项（完整参数）
    const options = {
      depth: "all" as const,           // 递归扫描所有子目录检查引用
      projectRoot: process.cwd()       // 项目根目录
    };

    // 尝试删除未被引用的图片
    const result1 = await safeDeleteLocalImage(
      "examples/demo-data",
      unusedImagePath,
      options  // 完整参数
    );

    console.log("\n=== 删除 unused.png ===");
    if (result1.deleted) {
      console.log("✓ 删除成功（未被引用）");
      console.log(`  路径: ${result1.path}`);
    }

    // 尝试删除被引用的图片
    const result2 = await safeDeleteLocalImage(
      "examples/demo-data",
      "examples/demo-data/images/logo.png",
      options  // 完整参数
    );

    console.log("\n=== 删除 logo.png ===");
    if (!result2.deleted) {
      console.log(`✗ 删除失败: ${result2.reason}`);
      console.log(`  首次引用位置: ${result2.firstReference.relativePath}`);
      console.log(`  行号: ${result2.firstReference.locations[0].line}`);
    }
  } finally {
    // 恢复演示文件
    console.log("\n⏮️ 恢复演示文件...");
    await restoreFiles(backup);
    console.log("✓ 演示文件已恢复");
  }
}

main();
