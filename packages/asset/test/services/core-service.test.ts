import { describe, expect, it, vi } from "vitest";
import { CoreService, createCoreService } from "../../src/services/core-service.js";

describe("CoreService", () => {
    describe("constructor", () => {
        it("should create instance with default config", () => {
            const service = new CoreService();
            expect(service.id).toBe("core");
        });

        it("should create instance with logger", () => {
            const logger = vi.fn();
            const service = new CoreService({ logger });
            expect(service.id).toBe("core");
        });
    });

    describe("initialize", () => {
        it("should update config when provided", () => {
            const service = new CoreService();
            const logger = vi.fn();
            service.initialize({ logger });
            // initialize should not throw
            expect(service.id).toBe("core");
        });

        it("should handle undefined config", () => {
            const service = new CoreService();
            service.initialize(undefined);
            expect(service.id).toBe("core");
        });
    });

    describe("filterImages", () => {
        it("should filter local images from document", () => {
            const service = new CoreService();
            const doc = "![alt1](./images/photo.png)\n![alt2](https://example.com/img.jpg)";
            const result = service.filterImages(doc, { mode: "sourceType", value: "local" });
            expect(result).toHaveLength(1);
            expect(result[0].src).toBe("./images/photo.png");
        });

        it("should return empty array when no local images", () => {
            const service = new CoreService();
            const doc = "![alt](https://example.com/img.jpg)";
            const result = service.filterImages(doc, { mode: "sourceType", value: "local" });
            expect(result).toHaveLength(0);
        });

        it("should return all images when no filter options", () => {
            const service = new CoreService();
            const doc = "![alt1](./img1.png)\n![alt2](https://example.com/img2.jpg)";
            const result = service.filterImages(doc);
            expect(result).toHaveLength(2);
        });

        it("should call logger when filtering", () => {
            const logger = vi.fn();
            const service = new CoreService({ logger });
            const doc = "![alt](./img.png)";
            service.filterImages(doc);
            expect(logger).toHaveBeenCalledWith("debug", "[CoreService] Filtering images");
        });
    });

    describe("replaceImages", () => {
        it("should replace image references", () => {
            const service = new CoreService();
            const doc = "![old](./old.png)";
            const replacements = [
                { field: "src" as const, pattern: "./old.png", newSrc: "./new.png" },
            ];
            const result = service.replaceImages(doc, replacements);
            expect(result).toContain("./new.png");
            expect(result).not.toContain("./old.png");
        });

        it("should handle empty replacements", () => {
            const service = new CoreService();
            const doc = "![alt](./img.png)";
            const result = service.replaceImages(doc, []);
            expect(result).toBe(doc);
        });

        it("should call logger when replacing", () => {
            const logger = vi.fn();
            const service = new CoreService({ logger });
            const doc = "![alt](./img.png)";
            service.replaceImages(doc, [
                { field: "src" as const, pattern: "./img.png", newSrc: "./new.png" },
            ]);
            expect(logger).toHaveBeenCalledWith("debug", "[CoreService] Replacing 1 images");
        });
    });
});

describe("createCoreService", () => {
    it("should create CoreService instance", () => {
        const service = createCoreService();
        expect(service).toBeInstanceOf(CoreService);
        expect(service.id).toBe("core");
    });

    it("should create CoreService with config", () => {
        const logger = vi.fn();
        const service = createCoreService({ logger });
        expect(service).toBeInstanceOf(CoreService);
        expect(service.id).toBe("core");
    });
});
