import { getModuleLogger } from "../infra/unified-logger.js";
import type { CloudStorageConfig as BaseCloudStorageConfig } from "@cmtx/storage";

const logger = getModuleLogger("config-parser");

// 扩展基础配置，支持额外的 path 和 forceHttps 字段
export interface CloudStorageConfig extends BaseCloudStorageConfig {
    /** 路径前缀 */
    path?: string;
    /** 强制使用 HTTPS */
    forceHttps?: boolean;
}

function parseProvider(obj: Record<string, unknown>): CloudStorageConfig["provider"] {
    if (obj.provider === "aliyun") {
        logger.info('[CMTX] Provider "aliyun" 已自动映射为 "aliyun-oss"');
        return "aliyun-oss";
    }

    if (typeof obj.provider === "string" && ["aliyun-oss", "tencent-cos"].includes(obj.provider)) {
        return obj.provider as CloudStorageConfig["provider"];
    }

    return "aliyun-oss";
}

function parseStringField(obj: Record<string, unknown>, key: string): string {
    return typeof obj[key] === "string" ? (obj[key] as string) : "";
}

function parseOptionalString(obj: Record<string, unknown>, key: string): string | undefined {
    const value = obj[key];
    if (typeof value === "string" && value.length > 0) {
        return value;
    }
    return undefined;
}

function parseBooleanField(
    obj: Record<string, unknown>,
    key: string,
    defaultValue: boolean,
): boolean {
    return typeof obj[key] === "boolean" ? (obj[key] as boolean) : defaultValue;
}

function buildConfig(
    obj: Record<string, unknown>,
    provider: CloudStorageConfig["provider"],
): CloudStorageConfig | null {
    const bucket = parseStringField(obj, "bucket");
    const region = parseStringField(obj, "region");

    if (!bucket || !region) {
        return null;
    }

    const path = parseOptionalString(obj, "path");
    const forceHttps = parseBooleanField(obj, "forceHttps", true);
    const accessKeyId = parseOptionalString(obj, "accessKeyId");
    const accessKeySecret = parseOptionalString(obj, "accessKeySecret");

    let domain = parseStringField(obj, "domain");
    if (!domain) {
        domain = generateDefaultDomain(provider, bucket, region);
    }

    return {
        provider,
        domain,
        bucket,
        region,
        path,
        forceHttps,
        accessKeyId,
        accessKeySecret,
    };
}

export function parseCloudStorageConfig(rawConfig: unknown): CloudStorageConfig {
    if (typeof rawConfig === "string") {
        if (rawConfig.trim() === "") {
            return createDefaultCloudStorageConfig();
        }

        try {
            rawConfig = JSON.parse(rawConfig);
        } catch {
            return createDefaultCloudStorageConfig();
        }
    }

    if (rawConfig && typeof rawConfig === "object") {
        const obj = rawConfig as Record<string, unknown>;
        const provider = parseProvider(obj);
        const config = buildConfig(obj, provider);

        if (config) {
            return config;
        }
    }

    return createDefaultCloudStorageConfig();
}

export function createDefaultCloudStorageConfig(): CloudStorageConfig {
    return {
        provider: "aliyun-oss",
        domain: "",
        bucket: "",
        region: "",
        forceHttps: true,
    };
}

export function generateDefaultDomain(
    provider: CloudStorageConfig["provider"],
    bucket: string,
    region: string,
): string {
    switch (provider) {
        case "aliyun-oss":
            return `${bucket}.${region}.aliyuncs.com`;
        case "tencent-cos":
            return `${bucket}.cos.${region}.myqcloud.com`;
        default:
            return "";
    }
}
