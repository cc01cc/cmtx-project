import { vi } from "vitest";

// Mock OSS client 实例
export const mockOssClient = {
    signatureUrl: vi.fn((key: string, options?: { expires?: number }) => {
        return `https://signed-url-for-${key}?expires=${options?.expires || 600}`;
    }),
    put: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    useBucket: vi.fn(),
    getBucketInfo: vi.fn(),
};

// Mock OSS 构造函数
const OSS = vi.fn(() => mockOssClient);

export default OSS;
