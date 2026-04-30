/**
 * 腾讯云 COS SDK 类型定义
 *
 * @remarks
 * cos-nodejs-sdk-v5 没有完整的类型定义，这里定义必要的接口
 *
 * @public
 */

/**
 * COS 客户端接口
 *
 * @remarks
 * 定义腾讯云 COS Node.js SDK v5 客户端的核心方法
 * 由于 SDK 类型定义不完整，使用宽松的类型定义
 *
 * @public
 */
export interface CosClient {
    /**
     * 上传文件
     */
    uploadFile(
        params: CosUploadFileParams,
        callback: (err: Error | null, data?: CosUploadFileResult) => void,
    ): void;

    /**
     * 获取对象 URL（用于生成预签名 URL）
     */
    getObjectUrl(
        params: Record<string, unknown>,
        callback: (err: Error | null, data?: { Url?: string }) => void,
    ): void;

    /**
     * 上传对象（从 Buffer）
     */
    putObject(
        params: {
            Bucket: string;
            Region: string;
            Key: string;
            Body: Buffer;
            Headers?: Record<string, string>;
        },
        callback: (err: Error | null) => void,
    ): void;

    /**
     * 获取对象
     *
     * @remarks
     * Output 和 Body 使用 any 类型是因为 COS SDK 未提供完整的类型定义
     * SDK 可能返回 Stream 或 Buffer，具体取决于使用方式
     */
    getObject(
        params: {
            Bucket: string;
            Region: string;
            Key: string;
            Output?: unknown;
        },
        callback: (err: Error | null, data?: { Body?: unknown }) => void,
    ): void;

    /**
     * 获取对象元数据
     */
    headObject(
        params: {
            Bucket: string;
            Region: string;
            Key: string;
        },
        callback: (err: Error | null, data?: { Headers?: Record<string, string> }) => void,
    ): void;

    /**
     * 删除对象
     *
     * @remarks
     * callback 的 data 参数使用 any 类型是因为 COS SDK 未提供完整的类型定义
     */
    deleteObject(
        params: {
            Bucket: string;
            Region: string;
            Key: string;
        },
        callback: (err: Error | null, data?: unknown) => void,
    ): void;
}

/**
 * COS 上传文件参数
 *
 * @public
 */
export interface CosUploadFileParams {
    /** 存储桶名称 */
    Bucket: string;
    /** 地域 */
    Region: string;
    /** 对象键 */
    Key: string;
    /** 本地文件路径 */
    FilePath: string;
}

/**
 * COS 上传文件结果
 *
 * @public
 */
export interface CosUploadFileResult {
    /** ETag */
    ETag?: string;
    /** Location */
    Location?: string;
    /** Bucket */
    Bucket?: string;
    /** Key */
    Key?: string;
}

/**
 * COS 获取预签名 URL 参数
 *
 * @public
 */
export interface CosGetSignedUrlParams {
    /** 存储桶名称 */
    Bucket: string;
    /** 地域 */
    Region: string;
    /** 对象键 */
    Key: string;
    /** 过期时间（秒） */
    Expires?: number;
    /** HTTP 方法 */
    Method?: string;
}

/**
 * 签名选项配置
 *
 * @public
 */
export interface SignOptions {
    /** 过期时间（秒） */
    expires: number;
    /** 内容类型 */
    contentType?: string;
    /** 内容处置 */
    contentDisposition?: string;
}
