/**
 * 示例 4: 使用阿里云 OSS 适配器
 *
 * 此示例演示如何配置和使用 AliOSSAdapter 上传图片到阿里云 OSS。
 *
 * 使用前请先安装 ali-oss:
 * ```bash
 * pnpm add ali-oss
 * ```
 *
 * 运行命令：
 *   pnpm exec tsx examples/scripts/gen-demo-data.ts
 *   pnpm exec tsx examples/4-with-ali-oss.ts
 *
 * 并设置环境变量（使用 ALIYUN 前缀）：
 * - ALIYUN_OSS_REGION: OSS 区域（如 oss-cn-hangzhou）
 * - ALIYUN_OSS_ACCESS_KEY_ID: AccessKey ID
 * - ALIYUN_OSS_ACCESS_KEY_SECRET: AccessKey Secret
 * - ALIYUN_OSS_BUCKET: Bucket 名称
 */

import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// 加载 examples/.env
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, ".env") });

import { uploadMultiImages } from "@cmtx/upload";
import {
  AliOSSAdapter,
  type AliOSSClient,
} from "@cmtx/upload/adapters/ali-oss";

// 动态导入 ali-oss（需要单独安装）
import OSS from "ali-oss";

async function run() {
  // 从环境变量读取配置
  const ossConfig = {
    region: process.env.ALIYUN_OSS_REGION || "oss-cn-hangzhou",
    accessKeyId: process.env.ALIYUN_OSS_ACCESS_KEY_ID,
    accessKeySecret: process.env.ALIYUN_OSS_ACCESS_KEY_SECRET,
    bucket: process.env.ALIYUN_OSS_BUCKET,
  };

  // 验证配置
  if (
    !ossConfig.accessKeyId ||
    !ossConfig.accessKeySecret ||
    !ossConfig.bucket
  ) {
    console.error("❌ 缺少 OSS 配置！");
    console.error("请设置以下环境变量：");
    console.error("  - ALIYUN_OSS_ACCESS_KEY_ID");
    console.error("  - ALIYUN_OSS_ACCESS_KEY_SECRET");
    console.error("  - ALIYUN_OSS_BUCKET");
    process.exit(1);
  }

  // 创建 OSS 客户端（此时已验证凭证非空）
  const ossClient = new OSS({
    region: ossConfig.region,
    accessKeyId: ossConfig.accessKeyId!,
    accessKeySecret: ossConfig.accessKeySecret!,
    bucket: ossConfig.bucket!,
  }) as unknown as AliOSSClient;

  // 创建适配器
  const adapter = new AliOSSAdapter(ossClient);

  console.log("=== 使用阿里云 OSS 上传图片 ===\n");
  console.log(`Region: ${ossConfig.region}`);
  console.log(`Bucket: ${ossConfig.bucket}\n`);

  console.log(
    "如未生成示例数据，请先运行：pnpm exec tsx examples/scripts/gen-demo-data.ts\n",
  );

  // 批量上传
  const results = await uploadMultiImages({
    workspace: {
      projectRoot: process.cwd(),
      searchDir: "examples/demo-data/docs",
    },
    adapter,
    naming: { uploadPrefix: `test/${new Date().getDate()}` },  // 按年份组织
    replace: true,  // 启用 Markdown 引用替换
    hooks: {
      onEvent: (event) => {
        if (event.type === "upload:start") {
          console.log(`⬆️  上传：${event.data?.localPath}`);
        } else if (event.type === "upload:complete") {
          console.log(`✓ URL: ${event.data?.ossUrl}\n`);
        } else if (event.type === "upload:error") {
          console.error(`❌ 失败：${event.data?.error?.message}\n`);
        }
      },
      logger: (level, message, meta) => {
        if (level === "error" || level === "warn") {
          console.log(`[${level.toUpperCase()}] ${message}`, meta || "");
        }
      },
    },
  });

  console.log(`\n✅ 完成！成功上传 ${results.length} 个文件`);
}

try {
  await run();
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error("\n❌ 错误：", message);
  process.exit(1);
}
