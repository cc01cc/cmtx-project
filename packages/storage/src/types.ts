/**
 * @cmtx/storage - 对象存储适配器
 *
 * @packageDocumentation
 * @module @cmtx/storage
 *
 * @description
 * 提供对象存储服务的抽象接口和具体实现。
 * 支持阿里云 OSS、腾讯云 COS 等多种存储服务。
 */

// ==================== 云服务商类型 ====================

/**
 * 云服务商类型
 *
 * @remarks
 * 定义支持的云存储服务提供商。
 * - `aliyun-oss`: 阿里云对象存储（支持）
 * - `tencent-cos`: 腾讯云对象存储（支持）
 * - `aws-s3`: AWS S3（暂未支持）
 *
 * @public
 */
export type CloudProvider = "aliyun-oss" | "tencent-cos" | "aws-s3";

/**
 * 阿里云凭证配置
 *
 * @description
 * 用于配置文件和工厂函数创建阿里云 OSS 适配器。
 *
 * @public
 */
export interface AliyunCredentials {
    /** 云服务商标识 */
    provider: "aliyun-oss";
    /** 访问密钥 ID */
    accessKeyId: string;
    /** 访问密钥 Secret */
    accessKeySecret: string;
    /** 区域，如 oss-cn-hangzhou */
    region: string;
    /** 存储桶名称 */
    bucket: string;
    /** STS 临时凭证（可选） */
    stsToken?: string;
}

/**
 * 腾讯云凭证配置
 *
 * @description
 * 用于配置文件和工厂函数创建腾讯云 COS 适配器。
 *
 * @remarks
 * - bucket 格式必须为 `bucketname-appid`
 * - region 格式如 `ap-guangzhou`
 *
 * @public
 */
export interface TencentCredentials {
    /** 云服务商标识 */
    provider: "tencent-cos";
    /** 密钥 ID */
    secretId: string;
    /** 密钥 Key */
    secretKey: string;
    /** 区域，如 ap-guangzhou */
    region: string;
    /** 存储桶名称（格式：bucketname-appid） */
    bucket: string;
    /** STS 临时凭证（可选） */
    sessionToken?: string;
}

/**
 * 统一凭证类型
 *
 * @description
 * 支持阿里云 OSS 和腾讯云 COS 的联合凭证类型。
 *
 * @public
 */
export type CloudCredentials = AliyunCredentials | TencentCredentials;

/**
 * 云存储配置（通用）
 *
 * @description
 * 通用的云存储配置接口，适用于预签名 URL 生成等场景。
 *
 * @public
 */
export interface CloudStorageConfig {
    /** 云服务商 */
    provider: CloudProvider;
    /** 存储桶名称 */
    bucket: string;
    /** 地域 */
    region: string;
    /** Storage Pool 中的 Storage ID（例如: 'default', 'backup'） */
    storageId?: string;
    /** 自定义域名（可选） */
    domain?: string;
    /** 访问密钥 ID（可选） */
    accessKeyId?: string;
    /** 访问密钥 Secret（可选） */
    accessKeySecret?: string;
}

// ==================== 适配器接口 ====================

/**
 * 存储适配器上传结果
 *
 * @public
 */
export interface AdapterUploadResult {
    /** 远程文件名 */
    name: string;
    /** 可访问的 URL */
    url: string;
}

/**
 * Buffer 上传选项
 *
 * @public
 */
export interface UploadBufferOptions {
    /** 是否禁止覆盖同名文件 */
    forbidOverwrite?: boolean;
    /** 内容类型 */
    contentType?: string;
    /** 自定义元数据 */
    metadata?: Record<string, string>;
}

/**
 * 预签名 URL 选项
 *
 * @public
 */
export interface GetSignedUrlOptions {
    /**
     * 内容处置方式
     * - inline: 浏览器内嵌显示（预览）
     * - attachment: 下载文件
     */
    disposition?: "inline" | "attachment";
}

/**
 * 对象元数据
 *
 * @public
 */
export interface ObjectMeta {
    /** 文件大小（字节） */
    size: number;
    /** 最后修改时间 */
    lastModified: Date;
    /** 内容类型 */
    contentType?: string;
    /** ETag */
    etag?: string;
}

/**
 * 存储适配器接口
 *
 * @remarks
 * 所有存储服务适配器必须实现此接口
 *
 * @public
 */
export interface IStorageAdapter {
    /**
     * 上传文件到云存储
     * @param localPath - 本地文件路径
     * @param remotePath - 远程存储路径
     * @returns 上传结果
     */
    upload(localPath: string, remotePath: string): Promise<AdapterUploadResult>;

    /**
     * 生成预签名 URL（可选）
     * @param remotePath - 远程存储路径
     * @param expires - 过期时间（秒）
     * @param options - 预签名选项
     * @returns 预签名 URL
     */
    getSignedUrl?(
        remotePath: string,
        expires: number,
        options?: GetSignedUrlOptions,
    ): Promise<string>;

    /**
     * 从 Buffer 上传（可选）
     * @param key - 远程存储路径
     * @param body - 文件内容 Buffer
     * @param options - 上传选项
     * @returns 上传结果
     */
    uploadBuffer?(
        key: string,
        body: Buffer,
        options?: UploadBufferOptions,
    ): Promise<AdapterUploadResult>;

    /**
     * 下载远程文件到本地（可选）
     * @param remotePath - 远程存储路径
     * @param localPath - 本地文件路径
     */
    downloadToFile?(remotePath: string, localPath: string): Promise<void>;

    /**
     * 获取对象元数据（可选）
     * @param remotePath - 远程存储路径
     * @returns 对象元数据
     */
    getObjectMeta?(remotePath: string): Promise<ObjectMeta>;

    /**
     * 检查对象是否存在（可选）
     * @param remotePath - 远程存储路径
     * @returns 是否存在
     */
    exists?(remotePath: string): Promise<boolean>;

    /**
     * 从 remotePath 构建完整 URL（可选）
     * @param remotePath - 远程存储路径
     * @returns 完整的 HTTPS URL
     */
    buildUrl?(remotePath: string): string;

    /**
     * 删除远程文件（可选）
     * @param remotePath - 远程存储路径
     */
    delete?(remotePath: string): Promise<void>;

    /**
     * 列出对象（可选）
     * @param prefix - 前缀（可选）
     * @returns 对象元数据列表
     */
    list?(prefix?: string): Promise<ObjectMeta[]>;
}

/**
 * 存储服务配置
 *
 * @description
 * 用于 Service 模式的存储配置接口
 *
 * @remarks
 * Storage 层只负责上传/下载/删除，不包含文件命名逻辑。
 * 命名逻辑由上层（如 @cmtx/asset）处理。
 *
 * @public
 */
export interface StorageServiceConfig {
    // TODO: IStorageAdapter 增加可选 timeout 参数（毫秒）
    //   阿里云 OSS: put() 支持 timeout
    //   腾讯云 COS: putObject() 支持 Timeout
    //   实现后从 @cmtx/asset/config 的 CmtxUploadConfig.fileWriteTimeout 读取
    /** 存储适配器 */
    adapter: IStorageAdapter;
    /** 前缀（可选） */
    prefix?: string;
}
