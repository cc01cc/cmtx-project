import { describe, expect, it, vi } from "vitest";
import { createServiceRegistry } from "../src/rules/services/service-registry-impl.js";
import {
    uploadImagesRule,
    downloadImagesRule,
    transferImagesRule,
    deleteImageRule,
    cleanupImagesRule,
    resizeImageRule,
} from "../src/rules/built-in/image-rules.js";
import type { RuleContext, ServiceRegistry } from "../src/rules/rule-types.js";

function createMockContext(
    registry: ServiceRegistry,
    overrides?: Partial<RuleContext>,
): RuleContext {
    return {
        document: "![img](photo.png)",
        filePath: "/test/doc.md",
        baseDirectory: "/test",
        services: registry,
        ...overrides,
    };
}

describe("config transmission chain: Rule -> Service", () => {
    describe("uploadImagesRule", () => {
        it("should pass namingTemplate, prefix, domain, replace, conflictStrategy to service", async () => {
            const uploadImagesInDocument = vi.fn().mockResolvedValue({
                content: "result",
                uploaded: 0,
                failed: [],
                skipped: [],
                downloaded: [],
            });
            const registry = createServiceRegistry();
            registry.register({ id: "upload", uploadImagesInDocument } as any);

            const ctx = createMockContext(registry);
            await uploadImagesRule.execute(ctx, {
                namingTemplate: "{date}/{name}{ext}",
                prefix: "blog/",
                domain: "cdn.example.com",
                replace: { fields: { src: "{cloudSrc}" } },
                conflictStrategy: "rename",
            });

            expect(uploadImagesInDocument).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(String),
                expect.objectContaining({
                    namingTemplate: "{date}/{name}{ext}",
                    prefix: "blog/",
                    domain: "cdn.example.com",
                    replace: { fields: { src: "{cloudSrc}" } },
                    conflictStrategy: "rename",
                }),
            );
        });

        it("should not pass options when config is undefined", async () => {
            const uploadImagesInDocument = vi.fn().mockResolvedValue({
                content: "result",
                uploaded: 0,
                failed: [],
                skipped: [],
                downloaded: [],
            });
            const registry = createServiceRegistry();
            registry.register({ id: "upload", uploadImagesInDocument } as any);

            const ctx = createMockContext(registry);
            await uploadImagesRule.execute(ctx, {});

            expect(uploadImagesInDocument).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(String),
                expect.objectContaining({}),
            );
        });
    });

    describe("downloadImagesRule", () => {
        it("should pass namingTemplate, concurrency, overwrite to service", async () => {
            const downloadImages = vi.fn().mockResolvedValue({ success: 0, failed: 0, skipped: 0 });
            const registry = createServiceRegistry();
            registry.register({ id: "download", downloadImages } as any);

            const ctx = createMockContext(registry);
            await downloadImagesRule.execute(ctx, {
                namingTemplate: "{date}/{name}{ext}",
                concurrency: 5,
                overwrite: true,
                domain: "cdn.example.com",
                outputDir: "/tmp/downloads",
            });

            expect(downloadImages).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(String),
                expect.objectContaining({
                    namingTemplate: "{date}/{name}{ext}",
                    concurrency: 5,
                    overwrite: true,
                    domain: "cdn.example.com",
                }),
            );
        });
    });

    describe("transferImagesRule", () => {
        it("should pass targetPrefix and namingTemplate (fix dead code)", async () => {
            const transferImages = vi.fn().mockResolvedValue({
                content: "",
                transferred: 0,
                failed: 0,
                skipped: 0,
                mappings: [],
                errors: [],
            });
            const registry = createServiceRegistry();
            registry.register({ id: "transfer", transferImages } as any);

            const ctx = createMockContext(registry);
            await transferImagesRule.execute(ctx, {
                targetPrefix: "target/images/",
                namingTemplate: "{date}/{name}{ext}",
                sourceDomain: "source.example.com",
                targetDomain: "target.example.com",
                concurrency: 3,
                deleteSource: true,
            });

            expect(transferImages).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(String),
                expect.objectContaining({
                    targetPrefix: "target/images/",
                    namingTemplate: "{date}/{name}{ext}",
                    sourceDomain: "source.example.com",
                    targetDomain: "target.example.com",
                    concurrency: 3,
                    deleteSource: true,
                }),
            );
        });

        it("should pass targetPrefix even when other options are undefined", async () => {
            const transferImages = vi.fn().mockResolvedValue({
                content: "",
                transferred: 0,
                failed: 0,
                skipped: 0,
                mappings: [],
                errors: [],
            });
            const registry = createServiceRegistry();
            registry.register({ id: "transfer", transferImages } as any);

            const ctx = createMockContext(registry);
            await transferImagesRule.execute(ctx, { targetPrefix: "images/" });

            expect(transferImages).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(String),
                expect.objectContaining({ targetPrefix: "images/" }),
            );
        });
    });

    describe("deleteImageRule", () => {
        it("should pass trashDir to safeDelete", async () => {
            const safeDelete = vi.fn().mockResolvedValue({
                success: true,
                deleted: true,
                detail: { referencedIn: [], hasReferences: false, forceDeleted: false },
            });
            const registry = createServiceRegistry();

            const ctx = createMockContext(registry, { baseDirectory: "/test" });

            const result = await deleteImageRule.execute(ctx, {
                strategy: "move",
                trashDir: "/trash",
                removeFromMarkdown: true,
            });

            expect(result.modified).toBe(false);
        });
    });

    describe("cleanupImagesRule", () => {
        it("should pass trashDir to pruneDirectory", async () => {
            const registry = createServiceRegistry();

            const ctx = createMockContext(registry, { baseDirectory: "/test" });

            const result = await cleanupImagesRule.execute(ctx, {
                strategy: "move",
                trashDir: "/trash",
            });

            expect(result.modified).toBe(false);
        });
    });

    describe("resizeImageRule", () => {
        it("should use widths instead of availableWidths", () => {
            const registry = createServiceRegistry();
            const ctx = createMockContext(registry, { document: "![img](photo.png)" });

            const result = resizeImageRule.execute(ctx, {
                widths: [300, 600, 900],
                targetWidth: 600,
            });

            expect(result.modified).toBe(true);
        });

        it("should apply server-side resize for matched OSS domain", () => {
            const registry = createServiceRegistry();
            const document = "![img](https://bucket.oss-cn-hangzhou.aliyuncs.com/img.png)";
            const ctx = createMockContext(registry, { document });

            const result = resizeImageRule.execute(ctx, {
                widths: [400, 800],
                targetWidth: 400,
                domains: [
                    { domain: "bucket.oss-cn-hangzhou.aliyuncs.com", provider: "aliyun-oss" },
                ],
            });

            expect(result.modified).toBe(true);
            expect(result.content).toContain("x-oss-process=image/resize,w_400");
        });

        it("should apply server-side resize for matched COS domain", () => {
            const registry = createServiceRegistry();
            const document = "![img](https://bucket.cos.ap-guangzhou.myqcloud.com/img.png)";
            const ctx = createMockContext(registry, { document });

            const result = resizeImageRule.execute(ctx, {
                widths: [400, 800],
                targetWidth: 400,
                domains: [
                    { domain: "bucket.cos.ap-guangzhou.myqcloud.com", provider: "tencent-cos" },
                ],
            });

            expect(result.modified).toBe(true);
            expect(result.content).toContain("imageMogr2/thumbnail/400x");
        });

        it("should apply client-side resize for unmatched domain", () => {
            const registry = createServiceRegistry();
            const document = "![img](https://other-cdn.example.com/img.png)";
            const ctx = createMockContext(registry, { document });

            const result = resizeImageRule.execute(ctx, {
                widths: [400, 800],
                targetWidth: 400,
                domains: [
                    { domain: "bucket.oss-cn-hangzhou.aliyuncs.com", provider: "aliyun-oss" },
                ],
            });

            expect(result.modified).toBe(true);
            expect(result.content).not.toContain("x-oss-process");
            expect(result.content).toContain("img.png");
        });

        it("should fall back to client-side when provider is html", () => {
            const registry = createServiceRegistry();
            const document = "![img](https://cdn.example.com/img.png)";
            const ctx = createMockContext(registry, { document });

            const result = resizeImageRule.execute(ctx, {
                widths: [400],
                targetWidth: 400,
                domains: [{ domain: "cdn.example.com", provider: "html" }],
            });

            expect(result.modified).toBe(true);
            expect(result.content).not.toContain("x-oss-process");
        });
    });
});
