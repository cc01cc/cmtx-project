/**
 * 示例 1: 检查单个文件是否引用了图片
 * 运行: pnpm exec tsx examples/1-check-single-file.ts
 */

import { isImageReferencedInFile } from "../src";

async function main() {
  // 配置项目根目录（可选，用于统一处理相对路径）
  const projectRoot = process.cwd();

  // 检查 logo.png 是否在 README.md 中被引用
  const result1 = await isImageReferencedInFile(
    "examples/demo-data/images/logo.png",
    "examples/demo-data/docs/README.md",
    { projectRoot }  // 完整参数
  );

  console.log("Logo referenced:", result1);
  // 输出: Logo referenced: true

  // 检查 unused.png 是否在 README.md 中被引用
  const result2 = await isImageReferencedInFile(
    "examples/demo-data/images/unused.png",
    "examples/demo-data/docs/README.md",
    { projectRoot }  // 完整参数
  );

  console.log("Unused referenced:", result2);
  // 输出: Unused referenced: false
}

main();

