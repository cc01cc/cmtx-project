/**
 * Presigned URL 测试数据
 */

// ==================== URL 测试数据 ====================
export const PRESIGNED_URL_FIXTURES = {
    // 有效的阿里云 OSS URL
    validAliyunUrl: "https://test-bucket.oss-cn-hangzhou.aliyuncs.com/images/photo.jpg",
    validAliyunUrlWithQuery:
        "https://test-bucket.oss-cn-hangzhou.aliyuncs.com/images/photo.jpg?version=123",
    validAliyunUrlNested:
        "https://test-bucket.oss-cn-hangzhou.aliyuncs.com/path/to/nested/image.png",

    // 有效的腾讯云 COS URL
    validTencentUrl: "https://test-bucket.cos.ap-guangzhou.myqcloud.com/images/photo.jpg",

    // 有效的 AWS S3 URL
    validAwsUrl: "https://test-bucket.s3.us-west-2.amazonaws.com/images/photo.jpg",

    // 无效 URL
    invalidUrl: "not-a-valid-url",
    malformedUrl: "https://[invalid-host",
    emptyUrl: "",

    // 未知域名 URL
    unknownDomainUrl: "https://unknown-domain.com/image.jpg",

    // 根路径 URL
    rootPathUrl: "https://test-bucket.oss-cn-hangzhou.aliyuncs.com/",
};

// ==================== 提供商配置测试数据 ====================
export const PROVIDER_CONFIG_FIXTURES = {
    // 阿里云完整配置
    aliyunComplete: {
        provider: "aliyun-oss" as const,
        domain: "test-bucket.oss-cn-hangzhou.aliyuncs.com",
        bucket: "test-bucket",
        region: "oss-cn-hangzhou",
        accessKeyId: "test-access-key-id",
        accessKeySecret: "test-access-key-secret",
    },

    // 阿里云最小配置
    aliyunMinimal: {
        provider: "aliyun-oss" as const,
        domain: "minimal-bucket.oss-cn-shanghai.aliyuncs.com",
        bucket: "minimal-bucket",
        region: "oss-cn-shanghai",
    },

    // 腾讯云配置
    tencent: {
        provider: "tencent-cos" as const,
        domain: "test-bucket.cos.ap-guangzhou.myqcloud.com",
        bucket: "test-bucket",
        region: "ap-guangzhou",
    },

    // AWS 配置
    aws: {
        provider: "aws" as const,
        domain: "test-bucket.s3.us-west-2.amazonaws.com",
        bucket: "test-bucket",
        region: "us-west-2",
    },

    // 缺少域名的配置（应被跳过）
    missingDomain: {
        provider: "aliyun-oss" as const,
        domain: "",
        bucket: "test-bucket",
        region: "oss-cn-hangzhou",
    },
};

// ==================== PresignedUrlConfig 测试数据 ====================
export const PRESIGNED_URL_CONFIG_FIXTURES = {
    // 完整配置
    complete: {
        imageFormat: "all" as const,
        expire: 600,
        maxRetryCount: 3,
        storageConfigs: {
            default: PROVIDER_CONFIG_FIXTURES.aliyunComplete,
        },
        domains: [
            {
                domain: "test-bucket.oss-cn-hangzhou.aliyuncs.com",
                useStorage: "default",
            },
        ],
        useStorageId: "default",
    },

    // 最小配置
    minimal: {
        imageFormat: "markdown" as const,
        expire: 300,
        maxRetryCount: 1,
        storageConfigs: {},
        domains: [],
    },

    // 默认配置
    default: {
        imageFormat: "all" as const,
        expire: 600,
        maxRetryCount: 3,
        storageConfigs: {},
        domains: [],
    },

    // 多提供商配置
    multiProvider: {
        imageFormat: "all" as const,
        expire: 600,
        maxRetryCount: 3,
        storageConfigs: {
            aliyun: PROVIDER_CONFIG_FIXTURES.aliyunComplete,
            tencent: PROVIDER_CONFIG_FIXTURES.tencent,
        },
        domains: [
            {
                domain: "test-bucket.oss-cn-hangzhou.aliyuncs.com",
                useStorage: "aliyun",
            },
            {
                domain: "test-bucket.cos.ap-guangzhou.myqcloud.com",
                useStorage: "tencent",
            },
        ],
        useStorageId: "aliyun",
    },
};

// ==================== 签名结果测试数据 ====================
export const SIGNED_URL_FIXTURES = {
    // 成功签名的 URL
    success:
        "https://test-bucket.oss-cn-hangzhou.aliyuncs.com/images/photo.jpg?OSSAccessKeyId=test&Signature=xxx&Expires=1234567890",

    // 签名失败（返回原始 URL）
    failure: PRESIGNED_URL_FIXTURES.validAliyunUrl,
};
