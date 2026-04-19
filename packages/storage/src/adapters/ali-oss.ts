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
 * import { AliOSSAdapter } from "@cmtx/storage/adapters/ali-oss";
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
 * @see {@link UploadBufferOptions} - Buffer 上传选项
 *
 * @officialDocs
 * - [ali-oss GitHub](https://github.com/ali-sdk/ali-oss)
 * - [阿里云 OSS 官方文档](https://www.alibabacloud.com/help/doc-detail/52834.htm)
 */

import { createWriteStream, writeFileSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import type OSS from 'ali-oss';
import type {
    AdapterUploadResult,
    IStorageAdapter,
    ObjectMeta,
    UploadBufferOptions,
} from '../types.js';

/**
 * 阿里云 OSS 客户端类型
 *
 * @remarks
 * 从 ali-oss 包导入的客户端类型
 *
 * @public
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
 * import { AliOSSAdapter } from "@cmtx/storage/adapters/ali-oss";
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
 * const result = await adapter.upload("/path/to/image.png", "images/image.png");
 * console.log(result.url);
 * ```
 *
 * @public
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
     *
     * @officialDocs
     * - [ali-oss .put()](https://github.com/ali-sdk/ali-oss#putname-file-options)
     * - [阿里云 PutObject API](https://help.aliyun.com/zh/oss/developer-reference/putobject)
     */
    async upload(localPath: string, remotePath: string): Promise<AdapterUploadResult> {
        try {
            const result = await this.client.put(remotePath, localPath);

            // 确保 URL 使用 HTTPS
            const httpsUrl = result.url.replace(/^http:/, 'https:');

            return {
                name: result.name,
                url: httpsUrl,
            } as AdapterUploadResult;
        } catch (error) {
            throw new Error(
                `Failed to upload to OSS: ${error instanceof Error ? error.message : String(error)}`,
                { cause: error }
            );
        }
    }

    /**
     * 生成预签名 URL
     *
     * @param remotePath - OSS 中的文件路径
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
     * - [ali-oss .signatureUrl()](https://github.com/ali-sdk/ali-oss#signatureurlname-options-strictobjectnamevalidation)
     * - [阿里云 签名URL](https://help.aliyun.com/zh/oss/developer-reference/sign-a-url)
     */
    async getSignedUrl(
        remotePath: string,
        expires: number,
        options?: import('../types.js').GetSignedUrlOptions
    ): Promise<string> {
        try {
            const signOptions: {
                expires: number;
                response?: {
                    'content-disposition': string;
                };
            } = { expires };

            // 处理 content-disposition 参数
            if (options?.disposition) {
                signOptions.response = {
                    'content-disposition': options.disposition,
                };
            }

            const signedUrl = await this.client.signatureUrl(remotePath, signOptions);
            // 确保 URL 使用 HTTPS
            return signedUrl.replace(/^http:/, 'https:');
        } catch (error) {
            throw new Error(
                `Failed to generate signed URL: ${error instanceof Error ? error.message : String(error)}`,
                { cause: error }
            );
        }
    }

    /**
     * 从 Buffer 上传文件到阿里云 OSS
     *
     * @param key - OSS 中的文件路径（键名）
     * @param body - 文件内容 Buffer
     * @param options - 上传选项
     * @returns 上传结果
     *
     * @example
     * ```typescript
     * const result = await adapter.uploadBuffer('images/photo.png', buffer, {
     *   forbidOverwrite: true,
     *   contentType: 'image/png'
     * });
     * ```
     */
    async uploadBuffer(
        key: string,
        body: Buffer,
        options?: UploadBufferOptions
    ): Promise<AdapterUploadResult> {
        try {
            const uploadOptions: OSS.PutObjectOptions = {
                headers: {} as Record<string, string>,
            };

            // 设置内容类型（通过 headers 设置）
            if (options?.contentType) {
                (uploadOptions.headers as Record<string, string>)['Content-Type'] =
                    options.contentType;
            }

            // 设置禁止覆盖头部
            if (options?.forbidOverwrite) {
                (uploadOptions.headers as Record<string, string>)['x-oss-forbid-overwrite'] =
                    'true';
            }

            // 设置自定义元数据（如果有）
            if (options?.metadata) {
                uploadOptions.meta = options.metadata as unknown as typeof uploadOptions.meta;
            }

            const result = await this.client.put(key, body, uploadOptions);

            // 确保 URL 使用 HTTPS
            const httpsUrl = result.url.replace(/^http:/, 'https:');

            return {
                name: result.name,
                url: httpsUrl,
            } as AdapterUploadResult;
        } catch (error) {
            throw new Error(
                `Failed to upload buffer to OSS: ${error instanceof Error ? error.message : String(error)}`,
                { cause: error }
            );
        }
    }

    /**
     * 下载远程文件到本地
     *
     * @param remotePath - OSS 中的文件路径
     * @param localPath - 本地文件保存路径
     *
     * @example
     * ```typescript
     * await adapter.downloadToFile('images/photo.png', '/tmp/photo.png');
     * ```
     *
     * @officialDocs
     * - [ali-oss .get()](https://github.com/ali-sdk/ali-oss#getname-file-options)
     * - [阿里云 GetObject API](https://help.aliyun.com/zh/oss/developer-reference/getobject)
     */
    async downloadToFile(remotePath: string, localPath: string): Promise<void> {
        try {
            const result = await this.client.get(remotePath);
            const content = result.content;

            // 处理 Buffer 类型
            if (Buffer.isBuffer(content)) {
                writeFileSync(localPath, content);
                return;
            }

            // 处理 Stream 类型
            if (content && typeof content === 'object' && 'pipe' in content) {
                const writeStream = createWriteStream(localPath);
                await pipeline(content as NodeJS.ReadableStream, writeStream);
                return;
            }

            throw new Error('Unexpected content type from OSS get response');
        } catch (error) {
            throw new Error(
                `Failed to download from OSS: ${error instanceof Error ? error.message : String(error)}`,
                { cause: error }
            );
        }
    }

    /**
     * 获取对象元数据
     *
     * @param remotePath - OSS 中的文件路径
     * @returns 对象元数据
     *
     * @example
     * ```typescript
     * const meta = await adapter.getObjectMeta('images/photo.png');
     * console.log(meta.size, meta.lastModified);
     * ```
     *
     * @officialDocs
     * - [ali-oss .head()](https://github.com/ali-sdk/ali-oss#headname-options)
     * - [阿里云 HeadObject API](https://help.aliyun.com/zh/oss/developer-reference/headobject)
     */
    async getObjectMeta(remotePath: string): Promise<ObjectMeta> {
        try {
            const result = await this.client.head(remotePath);
            const headers = result.res.headers as Record<string, string | undefined>;
            return {
                size: Number(headers['content-length'] || 0),
                lastModified: new Date(headers['last-modified'] || Date.now()),
                contentType: headers['content-type'],
                etag: headers.etag,
            };
        } catch (error) {
            throw new Error(
                `Failed to get object meta from OSS: ${error instanceof Error ? error.message : String(error)}`,
                { cause: error }
            );
        }
    }

    /**
     * 检查对象是否存在
     *
     * @param remotePath - OSS 中的文件路径
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
     * - [ali-oss .head()](https://github.com/ali-sdk/ali-oss#headname-options)
     * - [阿里云 HeadObject API](https://help.aliyun.com/zh/oss/developer-reference/headobject)
     */
    async exists(remotePath: string): Promise<boolean> {
        try {
            return await this.client.head(remotePath).then(() => true);
        } catch (error) {
            // 如果是 404 错误，说明文件不存在
            if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
                return false;
            }
            throw new Error(
                `Failed to check object existence in OSS: ${error instanceof Error ? error.message : String(error)}`,
                { cause: error }
            );
        }
    }

    /**
     * 从 remotePath 构建完整 URL
     *
     * @param remotePath - OSS 中的文件路径
     * @returns 完整的 HTTPS URL
     */
    buildUrl(remotePath: string): string {
        // Extract bucket and region from client configuration
        const clientConfig =
            (this.client as { options?: { bucket?: string; region?: string } }).options || {};
        const bucket = clientConfig.bucket || '<bucket>';
        const region = clientConfig.region || '<region>';

        // Format: https://{bucket}.{region}.aliyuncs.com/{path}
        return `https://${bucket}.${region}.aliyuncs.com/${remotePath}`;
    }

    /**
     * 删除远程文件
     *
     * @param remotePath - OSS 中的文件路径
     *
     * @example
     * ```typescript
     * await adapter.delete('images/photo.png');
     * ```
     *
     * @officialDocs
     * - [ali-oss .delete()](https://github.com/ali-sdk/ali-oss#deletename-options)
     * - [阿里云 DeleteObject API](https://help.aliyun.com/zh/oss/developer-reference/deleteobject)
     */
    async delete(remotePath: string): Promise<void> {
        try {
            await this.client.delete(remotePath);
        } catch (error) {
            throw new Error(
                `Failed to delete object from OSS: ${error instanceof Error ? error.message : String(error)}`,
                { cause: error }
            );
        }
    }
}
