/**
 * 示例 2: 查找所有引用特定图片的文件
 * 运行: pnpm exec tsx examples/2-find-all.ts
 */

import { findFilesReferencingImage } from "../src";

async function main() {
  // 配置选项（完整参数）
  const options = {
    depth: "all" as const,           // 递归扫描所有子目录（可选值: "all" | 0 | 1 | 2...）
    projectRoot: process.cwd()       // 项目根目录，用于统一处理相对路径
  };

  // 查找所有引用 logo.png 的文件
  const result1 = await findFilesReferencingImage(
    "examples/demo-data/images/logo.png",
    "examples/demo-data/docs",
    options  // 完整参数
  );

  console.log("\n=== 引用 logo.png 的文件 ===");
  console.log(`找到 ${result1.length} 个文件:`);
  result1.forEach(r => console.log(`  - ${r.relativePath}`));

  // 查找所有引用 unused.png 的文件
  const result2 = await findFilesReferencingImage(
    "examples/demo-data/images/unused.png",
    "examples/demo-data/docs",
    options  // 完整参数
  );

  console.log("\n=== 引用 unused.png 的文件 ===");
  console.log(`找到 ${result2.length} 个文件`);
  // 输出: 找到 0 个文件
}

main();
