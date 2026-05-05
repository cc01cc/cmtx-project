/**
 * URL 存在性检测单元测试
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
    checkUrlExists,
    checkUrlExistsBatch,
    checkUrlsInText,
    extractUrlsFromText,
} from "../src/utils/url-existence-check.js";

function createMockFetch(status: number, options?: { headers?: Record<string, string> }) {
    return vi.fn().mockResolvedValue({
        ok: status >= 200 && status < 300,
        status,
        headers: new Map(Object.entries(options?.headers ?? {})),
    });
}

function createErrorFetch(message: string) {
    return vi.fn().mockRejectedValue(new Error(message));
}

describe("checkUrlExists", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("should return exists=true for 200 response", async () => {
        const mockFetch = createMockFetch(200);
        const result = await checkUrlExists("https://example.com/image.png", {
            fetch: mockFetch as unknown as typeof globalThis.fetch,
        });

        expect(result.exists).toBe(true);
        expect(result.statusCode).toBe(200);
        expect(result.error).toBeUndefined();
        expect(mockFetch).toHaveBeenCalledOnce();
        expect(mockFetch).toHaveBeenCalledWith(
            "https://example.com/image.png",
            expect.objectContaining({ method: "HEAD" }),
        );
    });

    it("should return exists=true for 206 response", async () => {
        const mockFetch = createMockFetch(206);
        const result = await checkUrlExists("https://example.com/image.png", {
            fetch: mockFetch as unknown as typeof globalThis.fetch,
        });

        expect(result.exists).toBe(true);
        expect(result.statusCode).toBe(206);
    });

    it("should return exists=false for 404 response", async () => {
        const mockFetch = createMockFetch(404);
        const result = await checkUrlExists("https://example.com/missing.png", {
            fetch: mockFetch as unknown as typeof globalThis.fetch,
        });

        expect(result.exists).toBe(false);
        expect(result.statusCode).toBe(404);
    });

    it("should return exists=false for 500 response", async () => {
        const mockFetch = createMockFetch(500);
        const result = await checkUrlExists("https://example.com/error.png", {
            fetch: mockFetch as unknown as typeof globalThis.fetch,
        });

        expect(result.exists).toBe(false);
        expect(result.statusCode).toBe(500);
    });

    it("should fallback to GET when HEAD returns 405", async () => {
        let callCount = 0;
        const mockFetch = vi.fn().mockImplementation(async () => {
            callCount++;
            if (callCount === 1) {
                return { ok: false, status: 405, headers: new Map() };
            }
            return { ok: true, status: 206, headers: new Map() };
        });

        const result = await checkUrlExists("https://example.com/image.png", {
            fetch: mockFetch as unknown as typeof globalThis.fetch,
        });

        expect(result.exists).toBe(true);
        expect(result.statusCode).toBe(206);
        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(mockFetch).toHaveBeenNthCalledWith(
            1,
            "https://example.com/image.png",
            expect.objectContaining({ method: "HEAD" }),
        );
        expect(mockFetch).toHaveBeenNthCalledWith(
            2,
            "https://example.com/image.png",
            expect.objectContaining({ method: "GET" }),
        );
    });

    it("should fallback to GET when HEAD returns 501", async () => {
        let callCount = 0;
        const mockFetch = vi.fn().mockImplementation(async () => {
            callCount++;
            if (callCount === 1) {
                return { ok: false, status: 501, headers: new Map() };
            }
            return { ok: false, status: 404, headers: new Map() };
        });

        const result = await checkUrlExists("https://example.com/image.png", {
            fetch: mockFetch as unknown as typeof globalThis.fetch,
        });

        expect(result.exists).toBe(false);
        expect(result.statusCode).toBe(404);
        expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should return error for network failure", async () => {
        const mockFetch = createErrorFetch("Network error");
        const result = await checkUrlExists("https://example.com/image.png", {
            fetch: mockFetch as unknown as typeof globalThis.fetch,
        });

        expect(result.exists).toBe(false);
        expect(result.error).toBe("Network error");
        expect(result.statusCode).toBeUndefined();
    });

    it("should return error for abort timeout", async () => {
        const mockFetch = vi.fn().mockImplementation(
            () =>
                new Promise((_, reject) => {
                    setTimeout(() => reject(new Error("Aborted")), 100);
                }),
        );

        const result = await checkUrlExists("https://example.com/slow.png", {
            fetch: mockFetch as unknown as typeof globalThis.fetch,
            timeout: 10,
        });

        expect(result.exists).toBe(false);
        expect(result.error).toBeDefined();
    });

    it("should pass custom headers", async () => {
        const mockFetch = createMockFetch(200);
        await checkUrlExists("https://example.com/image.png", {
            fetch: mockFetch as unknown as typeof globalThis.fetch,
            headers: { Authorization: "Bearer token123" },
        });

        expect(mockFetch).toHaveBeenCalledWith(
            "https://example.com/image.png",
            expect.objectContaining({
                headers: { Authorization: "Bearer token123" },
            }),
        );
    });

    it("should use manual redirect when followRedirects is false", async () => {
        const mockFetch = createMockFetch(200);
        await checkUrlExists("https://example.com/image.png", {
            fetch: mockFetch as unknown as typeof globalThis.fetch,
            followRedirects: false,
        });

        expect(mockFetch).toHaveBeenCalledWith(
            "https://example.com/image.png",
            expect.objectContaining({ redirect: "manual" }),
        );
    });

    it("should use follow redirect by default", async () => {
        const mockFetch = createMockFetch(200);
        await checkUrlExists("https://example.com/image.png", {
            fetch: mockFetch as unknown as typeof globalThis.fetch,
        });

        expect(mockFetch).toHaveBeenCalledWith(
            "https://example.com/image.png",
            expect.objectContaining({ redirect: "follow" }),
        );
    });
});

describe("checkUrlExistsBatch", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("should check multiple URLs and return correct counts", async () => {
        let callCount = 0;
        const mockFetch = vi.fn().mockImplementation(async () => {
            callCount++;
            if (callCount === 1) return { ok: true, status: 200, headers: new Map() };
            if (callCount === 2) return { ok: false, status: 404, headers: new Map() };
            return { ok: true, status: 200, headers: new Map() };
        });

        const result = await checkUrlExistsBatch(
            ["https://example.com/a.png", "https://example.com/b.png", "https://example.com/c.png"],
            { fetch: mockFetch as unknown as typeof globalThis.fetch },
        );

        expect(result.total).toBe(3);
        expect(result.existsCount).toBe(2);
        expect(result.notExistsCount).toBe(1);
        expect(result.failedCount).toBe(0);
        expect(result.results).toHaveLength(3);
    });

    it("should count network errors as failures", async () => {
        let callCount = 0;
        const mockFetch = vi.fn().mockImplementation(async () => {
            callCount++;
            if (callCount === 1) return { ok: true, status: 200, headers: new Map() };
            throw new Error("Connection refused");
        });

        const result = await checkUrlExistsBatch(
            ["https://example.com/a.png", "https://example.com/b.png"],
            { fetch: mockFetch as unknown as typeof globalThis.fetch },
        );

        expect(result.total).toBe(2);
        expect(result.existsCount).toBe(1);
        expect(result.notExistsCount).toBe(0);
        expect(result.failedCount).toBe(1);
    });

    it("should include url in each result", async () => {
        const mockFetch = createMockFetch(200);
        const result = await checkUrlExistsBatch(
            ["https://example.com/a.png", "https://example.com/b.png"],
            { fetch: mockFetch as unknown as typeof globalThis.fetch },
        );

        expect(result.results[0].url).toBe("https://example.com/a.png");
        expect(result.results[1].url).toBe("https://example.com/b.png");
    });

    it("should handle empty array", async () => {
        const result = await checkUrlExistsBatch([]);

        expect(result.total).toBe(0);
        expect(result.existsCount).toBe(0);
        expect(result.notExistsCount).toBe(0);
        expect(result.failedCount).toBe(0);
        expect(result.results).toHaveLength(0);
    });

    it("should respect concurrency limit", async () => {
        let maxConcurrent = 0;
        let currentConcurrent = 0;

        const mockFetch = vi.fn().mockImplementation(async () => {
            currentConcurrent++;
            maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
            await new Promise((r) => setTimeout(r, 5));
            currentConcurrent--;
            return { ok: true, status: 200, headers: new Map() };
        });

        await checkUrlExistsBatch(
            ["https://example.com/1.png", "https://example.com/2.png", "https://example.com/3.png"],
            {
                fetch: mockFetch as unknown as typeof globalThis.fetch,
                concurrency: 1,
            },
        );

        expect(maxConcurrent).toBe(1);
    });

    it("should pass options to individual checks", async () => {
        const mockFetch = createMockFetch(200);
        await checkUrlExistsBatch(["https://example.com/a.png"], {
            fetch: mockFetch as unknown as typeof globalThis.fetch,
            timeout: 3000,
            headers: { "X-Custom": "value" },
        });

        expect(mockFetch).toHaveBeenCalledWith(
            "https://example.com/a.png",
            expect.objectContaining({
                method: "HEAD",
                headers: { "X-Custom": "value" },
            }),
        );
    });

    it("should throw early when continueOnError is false and a URL fails", async () => {
        let callCount = 0;
        const mockFetch = vi.fn().mockImplementation(async () => {
            callCount++;
            if (callCount === 1) {
                throw new Error("Connection refused");
            }
            return { ok: true, status: 200, headers: new Map() };
        });

        await expect(
            checkUrlExistsBatch(
                [
                    "https://example.com/fail.png",
                    "https://example.com/a.png",
                    "https://example.com/b.png",
                ],
                {
                    fetch: mockFetch as unknown as typeof globalThis.fetch,
                    concurrency: 1,
                    continueOnError: false,
                },
            ),
        ).rejects.toThrow("Connection refused");

        expect(callCount).toBe(1);
    });
});

describe("extractUrlsFromText", () => {
    it("should extract URL from Markdown image syntax", () => {
        const urls = extractUrlsFromText("![alt](https://example.com/image.png)");
        expect(urls).toEqual(["https://example.com/image.png"]);
    });

    it("should extract URL from Markdown link syntax", () => {
        const urls = extractUrlsFromText("[text](https://example.com/page)");
        expect(urls).toEqual(["https://example.com/page"]);
    });

    it("should extract URL from HTML img src", () => {
        const urls = extractUrlsFromText('<img src="https://example.com/image.png">');
        expect(urls).toEqual(["https://example.com/image.png"]);
    });

    it("should extract URL from HTML a href", () => {
        const urls = extractUrlsFromText('<a href="https://example.com/page">link</a>');
        expect(urls).toEqual(["https://example.com/page"]);
    });

    it("should extract URL from plain text", () => {
        const urls = extractUrlsFromText("Visit https://example.com/path for more info");
        expect(urls).toEqual(["https://example.com/path"]);
    });

    it("should extract URLs from mixed formats", () => {
        const text = `
            ![logo](https://example.com/logo.png)
            <a href="https://example.com/docs">docs</a>
            Visit https://example.com/path
        `;
        const urls = extractUrlsFromText(text);
        expect(urls).toEqual([
            "https://example.com/logo.png",
            "https://example.com/docs",
            "https://example.com/path",
        ]);
    });

    it("should deduplicate URLs by default", () => {
        const text = `
            ![first](https://example.com/image.png)
            [second](https://example.com/image.png)
        `;
        const urls = extractUrlsFromText(text);
        expect(urls).toEqual(["https://example.com/image.png"]);
    });

    it("should not deduplicate when deduplicate is false", () => {
        const text = `
            ![first](https://example.com/image.png)
            [second](https://example.com/image.png)
        `;
        const urls = extractUrlsFromText(text, { deduplicate: false });
        expect(urls).toEqual(["https://example.com/image.png", "https://example.com/image.png"]);
    });

    it("should support custom pattern", () => {
        const urls = extractUrlsFromText("file:///path/to/file.txt", {
            pattern: /file:\/\/[^\s)]+/g,
        });
        expect(urls).toEqual(["file:///path/to/file.txt"]);
    });

    it("should return empty array for empty text", () => {
        const urls = extractUrlsFromText("");
        expect(urls).toEqual([]);
    });

    it("should return empty array when no URLs found", () => {
        const urls = extractUrlsFromText("This text has no URLs");
        expect(urls).toEqual([]);
    });
});

describe("checkUrlsInText", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("should extract URLs and check them", async () => {
        let callCount = 0;
        const mockFetch = vi.fn().mockImplementation(async () => {
            callCount++;
            if (callCount === 1) return { ok: true, status: 200, headers: new Map() };
            return { ok: false, status: 404, headers: new Map() };
        });

        const text = `
            ![valid](https://example.com/valid.png)
            ![missing](https://example.com/missing.png)
        `;
        const result = await checkUrlsInText(text, {
            fetch: mockFetch as unknown as typeof globalThis.fetch,
        });

        expect(result.extractedUrls).toEqual([
            "https://example.com/valid.png",
            "https://example.com/missing.png",
        ]);
        expect(result.total).toBe(2);
        expect(result.existsCount).toBe(1);
        expect(result.notExistsCount).toBe(1);
    });

    it("should pass concurrency option to batch check", async () => {
        let maxConcurrent = 0;
        let currentConcurrent = 0;

        const mockFetch = vi.fn().mockImplementation(async () => {
            currentConcurrent++;
            maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
            await new Promise((r) => setTimeout(r, 5));
            currentConcurrent--;
            return { ok: true, status: 200, headers: new Map() };
        });

        const text = `
            ![a](https://example.com/a.png)
            ![b](https://example.com/b.png)
            ![c](https://example.com/c.png)
        `;
        await checkUrlsInText(text, {
            fetch: mockFetch as unknown as typeof globalThis.fetch,
            concurrency: 1,
        });

        expect(maxConcurrent).toBe(1);
    });

    it("should return extractedUrls in result", async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            headers: new Map(),
        });

        const text = `
            ![img1](https://example.com/1.png)
            [link](https://example.com/2)
            Visit https://example.com/3
        `;
        const result = await checkUrlsInText(text, {
            fetch: mockFetch as unknown as typeof globalThis.fetch,
        });

        expect(result.extractedUrls).toHaveLength(3);
        expect(result.extractedUrls).toContain("https://example.com/1.png");
        expect(result.extractedUrls).toContain("https://example.com/2");
        expect(result.extractedUrls).toContain("https://example.com/3");
    });
});
