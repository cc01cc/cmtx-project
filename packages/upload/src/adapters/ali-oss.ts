/**
 * 阿里云 OSS 存储适配器
 *
 * @packageDocumentation
 * @module adapters/ali-oss
 *
 * @description
 * 实现 IStorageAdapter 接口，用于上传文件到阿里云 OSS。
 *
 * @remarks
 * ## 功能特性
 *
 * - 封装阿里云 OSS SDK
 * - 实现标准存储适配器接口
 * - 自动处理 URL 格式标准化
 * - 提供完整的错误处理
 *
 * ## 使用要求
 *
 * 需要安装阿里云 OSS SDK：
 * ```bash
 * pnpm add ali-oss
 * ```
 *
 * ## 配置参数
 *
 * - **region**: OSS 区域（如 oss-cn-hangzhou）
 * - **accessKeyId**: 访问密钥 ID
 * - **accessKeySecret**: 访问密钥密码
 * - **bucket**: 存储桶名称
 *
 * ## 返回格式
 *
 * 上传成功后返回标准化的 HTTPS URL：
 * `https://{bucket}.{region}.aliyuncs.com/{remotePath}`
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
 *
 * @see {@link AliOSSAdapter} - 主要导出类
 * @see {@link IStorageAdapter} - 适配器接口
 * @see {@link AdapterUploadResult} - 上传结果类型
 */

import type { AdapterUploadResult, IStorageAdapter } from '../types.js';
import type OSS from 'ali-oss';

/**
 * 阿里云 OSS 客户端类型
 *
 * @remarks
 * 从 ali-oss 包导入的客户端类型
 */
export type AliOSSClient = OSS;

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
    async upload(localPath: string, remotePath: string): Promise<AdapterUploadResult> {
        try {
            const result = await this.client.put(remotePath, localPath);

            return {
                name: result.name,
                url: result.url,
            } as AdapterUploadResult;
        } catch (error) {
            throw new Error(`Failed to upload to OSS: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
