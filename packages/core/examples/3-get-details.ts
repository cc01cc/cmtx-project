/**
 * 示例 3: 获取详细的引用位置信息
 * 运行: pnpm exec tsx examples/3-get-details.ts
 */

import { getImageReferenceDetails } from "../src";

async function main() {
  // 配置选项（完整参数）
  const options = {
    depth: "all" as const,           // 递归扫描所有子目录
    projectRoot: process.cwd()       // 项目根目录
  };

  // 获取 logo.png 的详细引用位置
  const details = await getImageReferenceDetails(
    "examples/demo-data/images/logo.png",
    "examples/demo-data/docs",
    options  // 完整参数
  );

  console.log("\n=== logo.png 的详细引用位置 ===");
  console.log(`共在 ${details.length} 个文件中被引用:\n`);
  
  details.forEach(detail => {
    console.log(`文件: ${detail.relativePath}`);
    detail.locations.forEach(loc => {
      console.log(`  第 ${loc.line} 行, 第 ${loc.column} 列:`);
      console.log(`    ${loc.lineText.trim()}`);
    });
    console.log();
  });
}

main();
