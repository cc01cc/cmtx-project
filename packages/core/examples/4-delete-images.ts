/**
 * 示例 4: 图片删除功能综合演示
 * 运行: pnpm exec tsx examples/4-delete-images.ts
 *
 * 如未生成示例数据，请先运行：pnpm exec tsx examples/scripts/gen-demo-data.ts
 */

import { deleteLocalImage, deleteLocalImageSafely } from "../src";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFile, rm, mkdir } from "node:fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log("如未生成示例数据，请先运行：pnpm exec tsx examples/scripts/gen-demo-data.ts\n");

  const demoDir = resolve(__dirname, "demo-data");
  const testDir = resolve(demoDir, ".test-delete-comprehensive");
  const trashDir = resolve(demoDir, ".trash");

  // 清理并准备测试目录
  await rm(testDir, { recursive: true, force: true });
  await mkdir(testDir, { recursive: true });
  await writeFile(resolve(testDir, "test1.png"), "test data 1", "utf-8");
  await writeFile(resolve(testDir, "test2.png"), "test data 2", "utf-8");
  console.log("创建测试文件完成\n");

  console.log("=== 场景 1: 安全删除未被引用的图片 ===");
  const unusedImagePath = resolve(demoDir, "images/unused.png");
  const safeResult1 = await deleteLocalImageSafely(
    unusedImagePath,
    demoDir,
    {
      strategy: "trash",
      trashDir: resolve(demoDir, ".trash"),
    }
  );

  console.log(`状态: ${safeResult1.status === "success" ? "成功" : "失败"}`);
  if (safeResult1.error) {
    console.log(`错误: ${safeResult1.error}`);
  }

  console.log("\n=== 场景 2: 安全删除被引用的图片 ===");
  const logoPath = resolve(demoDir, "images/logo.png");
  const safeResult2 = await deleteLocalImageSafely(
    logoPath,
    demoDir,
    {
      strategy: "trash",
      trashDir: resolve(demoDir, ".trash"),
    }
  );

  console.log(`状态: ${safeResult2.status === "success" ? "成功" : "失败"}`);
  if (safeResult2.error) {
    console.log(`错误: ${safeResult2.error}`);
  }

  console.log("\n=== 场景 3: 直接删除 (trash 策略) ===");
  const test1Path = resolve(testDir, "test1.png");
  const directResult1 = await deleteLocalImage(test1Path, {
    strategy: "trash",
    trashDir,
    maxRetries: 3,
  });

  console.log(`状态: ${directResult1.status === "success" ? "成功" : "失败"}`);
  console.log(`重试次数: ${directResult1.retries}`);

  console.log("\n=== 场景 4: 直接删除 (move 策略) ===");
  const test2Path = resolve(testDir, "test2.png");
  const directResult2 = await deleteLocalImage(test2Path, {
    strategy: "move",
    trashDir,
    maxRetries: 3,
  });

  console.log(`状态: ${directResult2.status === "success" ? "成功" : "失败"}`);
  console.log(`重试次数: ${directResult2.retries}`);

  console.log(JSON.stringify({
    safeDelete: {
      unusedImage: safeResult1,
      referencedImage: safeResult2,
    },
    directDelete: {
      trashStrategy: directResult1,
      moveStrategy: directResult2,
    },
    summary: {
      safeDeletes: [safeResult1, safeResult2].filter(r => r.status === "success").length,
      directDeletes: [directResult1, directResult2].filter(r => r.status === "success").length,
    }
  }, null, 2));
}

main();