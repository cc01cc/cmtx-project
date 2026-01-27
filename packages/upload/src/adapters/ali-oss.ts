/**
 * 阿里云 OSS 存储适配器
 *
 * @packageDocumentation
 *
 * @remarks
 * 实现 IStorageAdapter 接口，用于上传文件到阿里云 OSS。
 *
 * @example
 * ```typescript
 * import OSS from "ali-oss";
 * import { AliOSSAdapter } from "@cmtx/upload/adapters/ali-oss";
 *
 * const client = new OSS({
 *   region: "oss-cn-hangzhou",
 *   accessKeyId: "your-access-key-id",
 *   accessKeySecret: "your-access-key-secret",
 *   bucket: "your-bucket-name"
 * });
 *
 * const adapter = new AliOSSAdapter(client);
 * ```
 */

import type { IStorageAdapter } from "../types.js";

/**
 * 阿里云 OSS 客户端接口（最小化依赖）
 *
 * @remarks
 * 不直接依赖 ali-oss 包，只定义需要的 API 方法。
 * 用户需自行安装和配置 ali-oss 客户端。
 */
export interface AliOSSClient {
  /**
   * 上传文件到 OSS
   *
   * @param remotePath - OSS 中的文件路径（不含 bucket）
   * @param localPath - 本地文件的绝对路径
   * @returns 上传结果，包含 URL 和名称
   */
  put(
    remotePath: string,
    localPath: string,
  ): Promise<{
    /** 文件的完整 URL（可能是 HTTP 或 HTTPS） */
    url: string;
    /** 文件在 OSS 中的路径/名称 */
    name: string;
  }>;
}

/**
 * 阿里云 OSS 存储适配器
 *
 * @remarks
 * 封装 ali-oss 客户端，实现 IStorageAdapter 接口。
 *
 * 特性：
 * - 自动处理 HTTP/HTTPS URL
 * - 返回规范化的 HTTPS URL
 * - 传递底层 OSS 错误信息
 *
 * @example
 * 基本使用：
 * ```typescript
 * import OSS from "ali-oss";
 * import { AliOSSAdapter } from "@cmtx/upload/adapters/ali-oss";
 * import { uploadAndReplace } from "@cmtx/upload";
 *
 * const client = new OSS({
 *   region: process.env.ALIYUN_OSS_REGION ?? "oss-cn-hangzhou",
 *   accessKeyId: process.env.ALIYUN_OSS_ACCESS_KEY_ID!,
 *   accessKeySecret: process.env.ALIYUN_OSS_ACCESS_KEY_SECRET!,
 *   bucket: process.env.ALIYUN_OSS_BUCKET ?? "my-bucket"
 * });
 *
 * const adapter = new AliOSSAdapter(client);
 *
 * await uploadAndReplace({
 *   projectRoot: "/path/to/project",
 *   searchDir: "docs",
 *   adapter,
 *   uploadPrefix: "blog/images"
 * });
 * ```
 */
export class AliOSSAdapter implements IStorageAdapter {
  /**
   * @param client - 阿里云 OSS 客户端实例
   */
  constructor(private readonly client: AliOSSClient) {}

  /**
   * 上传文件到阿里云 OSS
   *
   * @param localPath - 本地文件的绝对路径
   * @param remotePath - OSS 中的文件路径（不含 bucket）
   * @returns 完整的 HTTPS URL
   *
   * @throws {Error} 当上传失败时抛出错误
   */
  async upload(localPath: string, remotePath: string): Promise<string> {
    try {
      const result = await this.client.put(remotePath, localPath);

      // 确保返回 HTTPS URL
      let url = result.url;
      if (url.startsWith("http://")) {
        url = url.replace("http://", "https://");
      }

      return url;
    } catch (error) {
      // 包装错误信息
      throw new Error(
        `Failed to upload to OSS: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
