/**
 * 示例 3: 解析 Markdown 文件中的图片
 * 运行: pnpm exec tsx examples/3-get-details.ts
 *
 * 如未生成示例数据，请先运行：pnpm exec tsx examples/scripts/gen-demo-data.ts
 */

import { filterImagesInText } from "../src";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log("如未生成示例数据，请先运行：pnpm exec tsx examples/scripts/gen-demo-data.ts\n");

  const readmePath = resolve(__dirname, "demo-data/docs/README.md");
  const content = await readFile(readmePath, "utf-8");

  // 解析 Markdown 中的所有图片
  const images = filterImagesInText(content);

  console.log(`找到 ${images.length} 个图片`);

  // 按 syntax 分类
  const mdImages = images.filter(img => img.syntax === "md");
  const htmlImages = images.filter(img => img.syntax === "html");

  console.log(`  - Markdown 语法: ${mdImages.length} 个`);
  console.log(`  - HTML 标签: ${htmlImages.length} 个`);

  console.log(JSON.stringify({
    images,
    summary: {
      totalCount: images.length,
      mdCount: mdImages.length,
      htmlCount: htmlImages.length,
    }
  }, null, 2));
}

main();
