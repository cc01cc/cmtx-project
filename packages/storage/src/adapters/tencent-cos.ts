/**
 * 腾讯云 COS 存储适配器
 *
 * @packageDocumentation
 * @module adapters/tencent-cos
 *
 * @description
 * 实现 IStorageAdapter 接口，用于上传文件到腾讯云 COS。
 *
 * @remarks
 * ## 功能特性
 *
 * - 封装腾讯云 COS SDK
 * - 实现标准存储适配器接口
 * - 自动处理 URL 格式标准化
 * - 提供完整的错误处理
 *
 * ## 使用要求
 *
 * 需要安装腾讯云 COS SDK：
 * ```bash
 * pnpm add cos-nodejs-sdk-v5
 * ```
 *
 * ## 配置参数
 *
 * - **SecretId**: 密钥 ID
 * - **SecretKey**: 密钥 Key
 * - **Bucket**: 存储桶名称（格式：bucketname-appid）
 * - **Region**: 地域（如 ap-guangzhou）
 *
 * ## 返回格式
 *
 * 上传成功后返回标准化的 HTTPS URL：
 * `https://{bucket}.cos.{region}.myqcloud.com/{remotePath}`
 *
 * @example
 * ```typescript
 * import COS from "cos-nodejs-sdk-v5";
 * import { TencentCOSAdapter } from "@cmtx/storage/adapters/tencent-cos";
 *
 * const cos = new COS({
 *   SecretId: "your-secret-id",
 *   SecretKey: "your-secret-key",
 * });
 *
 * const adapter = new TencentCOSAdapter(cos, {
 *   Bucket: "my-bucket-1250000000",
 *   Region: "ap-guangzhou",
 * });
 * ```
 *
 * @see {@link TencentCOSAdapter} - 主要导出类
 * @see {@link IStorageAdapter} - 适配器接口
 * @see {@link AdapterUploadResult} - 上传结果类型
 * @see {@link UploadBufferOptions} - Buffer 上传选项
 *
 * @officialDocs
 * - [cos-nodejs-sdk-v5 GitHub](https://github.com/tencentyun/cos-nodejs-sdk-v5)
 * - [腾讯云 COS 官方文档](https://cloud.tencent.com/document/product/436/8629)
 */

import { createWriteStream } from 'node:fs';
import type {
    AdapterUploadResult,
    IStorageAdapter,
    ObjectMeta,
    UploadBufferOptions,
} from '../types.js';
import type { CosClient } from './cos-types.js';

/**
 * 腾讯云 COS 客户端类型
 *
 * @remarks
 * cos-nodejs-sdk-v5 没有完整的类型定义，使用 any 类型
 *
 * @public
 */
// Re-export from cos-types.ts for backward compatibility
export type { CosClient } from './cos-types.js';

/**
 * 腾讯云 COS 适配器配置
 *
 * @public
 */
export interface CosAdapterConfig {
    /** 存储桶名称（格式：bucketname-appid） */
    Bucket: string;
    /** 地域（如 ap-guangzhou） */
    Region: string;
}

/**
 * 腾讯云 COS 存储适配器
 *
 * @remarks
 * 封装 cos-nodejs-sdk-v5 客户端，实现 IStorageAdapter 接口。
 *
 * 特性：
 * - 自动处理 HTTP/HTTPS URL
 * - 返回规范化的 HTTPS URL
 * - 传递底层 COS 错误信息
 *
 * @example
 * 基本使用：
 * ```typescript
 * import COS from "cos-nodejs-sdk-v5";
 * import { TencentCOSAdapter } from "@cmtx/storage/adapters/tencent-cos";
 *
 * const cos = new COS({
 *   SecretId: process.env.TENCENT_SECRET_ID!,
 *   SecretKey: process.env.TENCENT_SECRET_KEY!,
 * });
 *
 * const adapter = new TencentCOSAdapter(cos, {
 *   Bucket: "my-bucket-1250000000",
 *   Region: "ap-guangzhou",
 * });
 *
 * const result = await adapter.upload("/path/to/image.png", "images/image.png");
 * console.log(result.url);
 * ```
 *
 * @public
 */
export class TencentCOSAdapter implements IStorageAdapter {
    /**
     * @param client - 腾讯云 COS 客户端实例
     * @param config - 适配器配置（包含 Bucket 和 Region）
     */
    constructor(
        private readonly client: CosClient,
        private readonly config: CosAdapterConfig
    ) {}

    /**
     * 上传文件到腾讯云 COS
     *
     * @param localPath - 本地文件的绝对路径
     * @param remotePath - COS 中的文件路径
     * @returns 完整的 HTTPS URL
     *
     * @throws {Error} 当上传失败时抛出错误
     *
     * @officialDocs
     * - [COS uploadFile](https://cloud.tencent.com/document/product/436/64980)
     * - [腾讯云 上传对象](https://cloud.tencent.com/document/product/436/64980)
     */
    async upload(localPath: string, remotePath: string): Promise<AdapterUploadResult> {
        return new Promise((resolve, reject) => {
            this.client.uploadFile(
                {
                    Bucket: this.config.Bucket,
                    Region: this.config.Region,
                    Key: remotePath,
                    FilePath: localPath,
                },
                (err: Error | null) => {
                    if (err) {
                        reject(
                            new Error(`Failed to upload to COS: ${err.message || String(err)}`, {
                                cause: err,
                            })
                        );
                    } else {
                        resolve({
                            name: remotePath,
                            url: this.buildUrl(remotePath),
                        });
                    }
                }
            );
        });
    }

    /**
     * 生成预签名 URL
     *
     * @param remotePath - COS 中的文件路径
     * @param expires - 过期时间（秒）
     * @param options - 预签名选项
     * @returns 预签名 URL
     *
     * @example
     * ```typescript
     * // 默认行为
     * const url = await adapter.getSignedUrl('images/photo.png', 3600);
     *
     * // 浏览器预览模式
     * const previewUrl = await adapter.getSignedUrl('images/photo.png', 3600, { disposition: 'inline' });
     *
     * // 下载模式
     * const downloadUrl = await adapter.getSignedUrl('images/photo.png', 3600, { disposition: 'attachment' });
     * ```
     *
     * @officialDocs
     * - [COS getObjectUrl](https://cloud.tencent.com/document/product/436/36121)
     * - [腾讯云 生成预签名 URL](https://cloud.tencent.com/document/product/436/36121)
     */
    async getSignedUrl(
        remotePath: string,
        expires: number,
        options?: import('../types.js').GetSignedUrlOptions
    ): Promise<string> {
        const params: Record<string, unknown> = {
            Bucket: this.config.Bucket,
            Region: this.config.Region,
            Key: remotePath,
            Sign: true,
            Expires: expires,
            Protocol: 'https:',
        };

        // 处理 content-disposition 参数
        if (options?.disposition === 'inline') {
            params.Query = { 'response-content-disposition': 'inline' };
        } else if (options?.disposition === 'attachment') {
            params.Query = { 'response-content-disposition': 'attachment' };
        }

        return new Promise((resolve, reject) => {
            this.client.getObjectUrl(params, (err: Error | null, data?: { Url?: string }) => {
                if (err) {
                    reject(
                        new Error(`Failed to generate signed URL: ${err.message || String(err)}`, {
                            cause: err,
                        })
                    );
                } else if (data?.Url) {
                    resolve(data.Url);
                } else {
                    reject(new Error('Failed to generate signed URL: no URL returned'));
                }
            });
        });
    }

    /**
     * 从 Buffer 上传文件到腾讯云 COS
     *
     * @param key - COS 中的文件路径
     * @param body - 文件内容 Buffer
     * @param options - 上传选项
     * @returns 上传结果
     *
     * @example
     * ```typescript
     * const result = await adapter.uploadBuffer('images/photo.png', buffer, {
     *   contentType: 'image/png'
     * });
     * ```
     */
    async uploadBuffer(
        key: string,
        body: Buffer,
        options?: UploadBufferOptions
    ): Promise<AdapterUploadResult> {
        return new Promise((resolve, reject) => {
            const params: {
                Bucket: string;
                Region: string;
                Key: string;
                Body: Buffer;
                Headers?: Record<string, string>;
            } = {
                Bucket: this.config.Bucket,
                Region: this.config.Region,
                Key: key,
                Body: body,
            };

            if (options?.contentType) {
                params.Headers = { 'Content-Type': options.contentType };
            }

            this.client.putObject(params, (err: Error | null) => {
                if (err) {
                    reject(
                        new Error(`Failed to upload buffer to COS: ${err.message || String(err)}`, {
                            cause: err,
                        })
                    );
                } else {
                    resolve({
                        name: key,
                        url: this.buildUrl(key),
                    });
                }
            });
        });
    }

    /**
     * 下载远程文件到本地
     *
     * @param remotePath - COS 中的文件路径
     * @param localPath - 本地文件保存路径
     *
     * @example
     * ```typescript
     * await adapter.downloadToFile('images/photo.png', '/tmp/photo.png');
     * ```
     *
     * @officialDocs
     * - [COS getObject](https://cloud.tencent.com/document/product/436/64981)
     * - [腾讯云 下载对象](https://cloud.tencent.com/document/product/436/64981)
     */
    async downloadToFile(remotePath: string, localPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.client.getObject(
                {
                    Bucket: this.config.Bucket,
                    Region: this.config.Region,
                    Key: remotePath,
                    Output: createWriteStream(localPath),
                },
                (err: Error | null) => {
                    if (err) {
                        reject(
                            new Error(
                                `Failed to download from COS: ${err.message || String(err)}`,
                                { cause: err }
                            )
                        );
                    } else {
                        resolve();
                    }
                }
            );
        });
    }

    /**
     * 获取对象元数据
     *
     * @param remotePath - COS 中的文件路径
     * @returns 对象元数据
     *
     * @example
     * ```typescript
     * const meta = await adapter.getObjectMeta('images/photo.png');
     * console.log(meta.size, meta.lastModified);
     * ```
     *
     * @officialDocs
     * - [COS headObject](https://cloud.tencent.com/document/product/436/64986)
     * - [腾讯云 查询对象元数据](https://cloud.tencent.com/document/product/436/64986)
     */
    async getObjectMeta(remotePath: string): Promise<ObjectMeta> {
        return new Promise((resolve, reject) => {
            this.client.headObject(
                {
                    Bucket: this.config.Bucket,
                    Region: this.config.Region,
                    Key: remotePath,
                },
                (err: Error | null, data?: { Headers?: Record<string, string> }) => {
                    if (err) {
                        reject(
                            new Error(
                                `Failed to get object meta from COS: ${err.message || String(err)}`,
                                { cause: err }
                            )
                        );
                    } else {
                        const headers = data?.Headers || {};
                        resolve({
                            size: Number(headers['content-length'] || 0),
                            lastModified: new Date(headers['last-modified'] || Date.now()),
                            contentType: headers['content-type'],
                            etag: headers.etag,
                        });
                    }
                }
            );
        });
    }

    /**
     * 检查对象是否存在
     *
     * @param remotePath - COS 中的文件路径
     * @returns 是否存在
     *
     * @example
     * ```typescript
     * if (await adapter.exists('images/photo.png')) {
     *   console.log('File exists');
     * }
     * ```
     *
     * @officialDocs
     * - [COS headObject](https://cloud.tencent.com/document/product/436/64986)
     * - [腾讯云 查询对象元数据](https://cloud.tencent.com/document/product/436/64986)
     */
    async exists(remotePath: string): Promise<boolean> {
        return new Promise((resolve) => {
            this.client.headObject(
                {
                    Bucket: this.config.Bucket,
                    Region: this.config.Region,
                    Key: remotePath,
                },
                (err: (Error & { statusCode?: number }) | null) => {
                    if (err) {
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                }
            );
        });
    }

    /**
     * 删除远程文件
     *
     * @param remotePath - COS 中的文件路径
     *
     * @example
     * ```typescript
     * await adapter.delete('images/photo.png');
     * ```
     *
     * @officialDocs
     * - [COS deleteObject](https://cloud.tencent.com/document/product/436/64983)
     * - [腾讯云 删除对象](https://cloud.tencent.com/document/product/436/64983)
     */
    async delete(remotePath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.client.deleteObject(
                {
                    Bucket: this.config.Bucket,
                    Region: this.config.Region,
                    Key: remotePath,
                },
                (err: Error | null) => {
                    if (err) {
                        reject(
                            new Error(
                                `Failed to delete object from COS: ${err.message || String(err)}`,
                                { cause: err }
                            )
                        );
                    } else {
                        resolve();
                    }
                }
            );
        });
    }

    /**
     * 构建对象访问 URL
     *
     * @param key - 对象键名
     * @returns HTTPS URL
     */
    buildUrl(key: string): string {
        return `https://${this.config.Bucket}.cos.${this.config.Region}.myqcloud.com/${key}`;
    }
}
