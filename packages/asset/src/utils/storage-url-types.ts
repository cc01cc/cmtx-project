/**
 * 云存储 URL 类型定义
 *
 * @module utils/storage-url-types
 * @description
 * 定义多云服务商 URL 检测的类型系统，支持阿里云 OSS、腾讯云 COS、AWS S3。
 *
 * @remarks
 * ## 支持的云服务商
 * - 阿里云 OSS - Object Storage Service
 * - 腾讯云 COS - Cloud Object Storage
 * - AWS S3 - Simple Storage Service
 *
 * ## 官方文档
 * - 阿里云 OSS: <https://www.alibabacloud.com/help/en/oss>
 * - 腾讯云 COS: <https://cloud.tencent.com/document/product/436>
 * - AWS S3: <https://docs.aws.amazon.com/s3/index.html>
 */

/**
 * 检测到的云服务商类型
 *
 * @remarks
 * 定义 URL 检测功能支持的云服务商。
 * - `aliyun`: 阿里云（支持）
 * - `tencent`: 腾讯云（支持）
 * - `aws`: AWS S3（支持检测，暂未支持上传）
 * - `unknown`: 未知服务商
 *
 * @public
 */
export type DetectedCloudProvider = 'aliyun' | 'tencent' | 'aws' | 'unknown';

/**
 * 检测到的云服务商类型
 *
 * @remarks
 * 定义 URL 检测功能支持的云服务商。
 * - `aliyun`: 阿里云（支持）
/**
 * 云存储 URL 类型枚举
 *
 * @remarks
 * ## URL 类型说明
 *
 * ### 阿里云 OSS
 * - `ALIYUN_OSS` - 阿里云 OSS URL（未签名）
 * - `ALIYUN_OSS_SIGNED` - 阿里云 OSS 签名 URL
 *
 * ### 腾讯云 COS
 * - `TENCENT_COS` - 腾讯云 COS URL（未签名）
 * - `TENCENT_COS_SIGNED` - 腾讯云 COS 签名 URL
 *
 * ### AWS S3
 * - `AWS_S3` - AWS S3 URL（未签名）
 * - `AWS_S3_SIGNED` - AWS S3 签名 URL
 *
 * ### 其他
 * - `CUSTOM_DOMAIN` - 自定义域名（需要配置映射）
 * - `OTHER` - 其他 URL（非云存储）
 *
 * @see 阿里云 OSS 文档：<https://www.alibabacloud.com/help/en/oss/user-guide/regions-and-endpoints>
 * @see 腾讯云 COS 文档：<https://cloud.tencent.com/document/product/436/6224>
 * @see AWS S3 文档：<https://docs.aws.amazon.com/AmazonS3/latest/userguide/VirtualHosting.html>
 *
 * @public
 */
export enum StorageUrlType {
    /** 阿里云 OSS URL（未签名） */
    ALIYUN_OSS = 'aliyun_oss',
    /** 阿里云 OSS 签名 URL */
    ALIYUN_OSS_SIGNED = 'aliyun_oss_signed',
    /** 腾讯云 COS URL（未签名） */
    TENCENT_COS = 'tencent_cos',
    /** 腾讯云 COS 签名 URL */
    TENCENT_COS_SIGNED = 'tencent_cos_signed',
    /** AWS S3 URL（未签名） */
    AWS_S3 = 'aws_s3',
    /** AWS S3 签名 URL */
    AWS_S3_SIGNED = 'aws_s3_signed',
    /** 自定义域名（需要配置映射） */
    CUSTOM_DOMAIN = 'custom_domain',
    /** 其他 URL（非云存储） */
    OTHER = 'other',
}

/**
 * URL 检测信息
 *
 * @remarks
 * 包含完整的 URL 检测信息，包括云服务商类型、URL 类型、bucket、region 等。
 *
 * @public
 */
export interface StorageUrlInfo {
    /** 原始 URL */
    originalUrl: string;
    /** 解析后的 URL 对象 */
    url: URL;
    /** 云服务商类型 */
    provider: DetectedCloudProvider;
    /** URL 类型 */
    urlType: StorageUrlType;
    /** 是否签名 URL */
    isSigned: boolean;
    /** 存储桶名称（如果可提取） */
    bucket?: string;
    /** 地域（如果可提取） */
    region?: string;
    /** 对象键/路径（如果可提取） */
    key?: string;
    /** 自定义域名（如果匹配） */
    customDomain?: string;
}

/**
 * URL 检测选项
 *
 * @remarks
 * 用于配置 URL 检测行为，支持自定义域名映射。
 *
 * @public
 */
export interface StorageUrlDetectOptions {
    /** 自定义域名列表 */
    customDomains?: string[];
    /** 域名到云服务商的映射 */
    domainProviderMap?: Record<string, DetectedCloudProvider>;
}

/**
/**
 * 签名 URL 参数定义
 *
 * @remarks
 * 各云服务商签名 URL 的必需参数列表。
 *
 * @public
 */
export interface SignedUrlParams {
    /** 阿里云 OSS 签名参数 */
    ALIYUN: string[];
    /** 腾讯云 COS 签名参数 */
    TENCENT: string[];
    /** AWS S3 签名参数 */
    AWS: string[];
}
