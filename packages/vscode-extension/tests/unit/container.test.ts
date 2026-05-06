import { describe, expect, it } from "vitest";
import { createServiceRegistry } from "@cmtx/rule-engine";
import { createVsCodeContainer, createStorageAdapterAsync } from "../../src/container.js";

describe("createVsCodeContainer", () => {
    const mockWorkspaceFolder = { uri: { fsPath: "/test" }, name: "test", index: 0 } as any;

    it("returns a ServiceRegistry instance", () => {
        const registry = createVsCodeContainer(null, null);
        expect(registry).toBeDefined();
        expect(registry.register).toBeInstanceOf(Function);
        expect(registry.get).toBeInstanceOf(Function);
    });

    it("returns empty registry when workspaceFolder is null", () => {
        const registry = createVsCodeContainer(null, { version: "v2" });
        expect(registry.getAllIds()).toEqual([]);
    });

    it("returns empty registry when config is null", () => {
        const registry = createVsCodeContainer(mockWorkspaceFolder, null);
        expect(registry.getAllIds()).toEqual([]);
    });

    it("registers callbackService when both workspaceFolder and config are provided", () => {
        const registry = createVsCodeContainer(mockWorkspaceFolder, { version: "v2" });
        const ids = registry.getAllIds();
        expect(ids).toContain("callback");
    });

    it("registers only callbackService (counter is deferred)", () => {
        const registry = createVsCodeContainer(mockWorkspaceFolder, { version: "v2" });
        const ids = registry.getAllIds();
        expect(ids).toEqual(["callback"]);
    });
});

describe("createStorageAdapterAsync", () => {
    it("creates aliyun-oss adapter", async () => {
        const adapter = await createStorageAdapterAsync({
            adapter: "aliyun-oss",
            config: {
                bucket: "test",
                region: "oss-cn-hangzhou",
                accessKeyId: "key",
                accessKeySecret: "secret",
            },
        });
        expect(adapter).toBeDefined();
        expect(typeof adapter.upload).toBe("function");
    });

    it("creates tencent-cos adapter", async () => {
        const adapter = await createStorageAdapterAsync({
            adapter: "tencent-cos",
            config: {
                bucket: "test",
                region: "ap-guangzhou",
                accessKeyId: "key",
                accessKeySecret: "secret",
            },
        });
        expect(adapter).toBeDefined();
        expect(typeof adapter.upload).toBe("function");
    });

    it("rejects unsupported adapter", async () => {
        await expect(
            createStorageAdapterAsync({
                adapter: "unknown",
                config: {},
            }),
        ).rejects.toThrow("Unsupported storage adapter");
    });
});
