/**
 * 示例 2: 从目录中批量筛选图片
 * 运行: pnpm exec tsx examples/2-find-all.ts
 *
 * 如未生成示例数据，请先运行：pnpm exec tsx examples/scripts/gen-demo-data.ts
 */

import { filterImagesFromDirectory } from "../src";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log("如未生成示例数据，请先运行：pnpm exec tsx examples/scripts/gen-demo-data.ts\n");

  const docsDir = resolve(__dirname, "demo-data/docs");

  // 筛选所有本地图片
  const localImages = await filterImagesFromDirectory(docsDir, {
    mode: "sourceType",
    value: "local",
  });

  console.log(`找到 ${localImages.length} 个本地图片`);

  // 筛选所有 Web 图片
  const webImages = await filterImagesFromDirectory(docsDir, {
    mode: "sourceType",
    value: "web",
  });

  console.log(`找到 ${webImages.length} 个 Web 图片`);

  // 统计各文件的图片数量（只统计有 relativePath 的）
  const stats = new Map<string, { local: number; web: number }>();
  for (const img of localImages) {
    if (!("relativePath" in img)) continue;
    const file = (img as { relativePath: string }).relativePath;
    if (!stats.has(file)) stats.set(file, { local: 0, web: 0 });
    stats.get(file)!.local++;
  }
  for (const img of webImages) {
    if (!("relativePath" in img)) continue;
    const file = (img as { relativePath: string }).relativePath;
    if (!stats.has(file)) stats.set(file, { local: 0, web: 0 });
    stats.get(file)!.web++;
  }

  console.log("\n" + JSON.stringify({
    localImages,
    webImages,
    summary: {
      localCount: localImages.length,
      webCount: webImages.length,
      totalCount: localImages.length + webImages.length,
      fileStats: Object.fromEntries(stats),
    }
  }, null, 2));
}

main();
