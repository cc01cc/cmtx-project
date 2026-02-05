/**
 * 示例 5: 直接删除图片
 * 运行: pnpm exec tsx examples/5-delete-file.ts
 *
 * 如未生成示例数据，请先运行：pnpm exec tsx examples/scripts/gen-demo-data.ts
 */

import { deleteLocalImage } from "../src";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFile, mkdir } from "node:fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log("如未生成示例数据，请先运行：pnpm exec tsx examples/scripts/gen-demo-data.ts\n");

  // 创建临时测试文件
  const demoDir = resolve(__dirname, "demo-data");
  const testDir = resolve(demoDir, ".test-delete-example");
  const testFile = resolve(testDir, "test.png");
  const trashDir = resolve(demoDir, ".trash");

  await mkdir(testDir, { recursive: true });
  await writeFile(testFile, "test data", "utf-8");
  console.log("创建测试文件:", testFile);

  console.log("\n=== 删除测试 ===");

  const result1 = await deleteLocalImage(testFile, {
    strategy: "trash",
    trashDir,
    maxRetries: 3,
  });

  console.log("结果 1 (trash 策略):", result1.status === "success" ? "成功" : "失败");

  // 重新创建文件，测试 move 策略
  await mkdir(testDir, { recursive: true });
  await writeFile(testFile, "test data", "utf-8");

  const result2 = await deleteLocalImage(testFile, {
    strategy: "move",
    trashDir,
    maxRetries: 3,
  });

  console.log("结果 2 (move 策略):", result2.status === "success" ? "成功" : "失败");

  console.log("\n" + JSON.stringify({ result1, result2 }, null, 2));
}

await main();
