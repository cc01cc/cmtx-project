/**
 * @cmtx/upload - 测试套件
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import { analyzeImages, uploadSingleImage, uploadMultiImages, resolveNamingTemplate, type IStorageAdapter, type UploadEvent } from "../src/index.js";

// 临时测试目录
const TEST_DIR = resolve(process.cwd(), ".test-upload");
const DOCS_DIR = join(TEST_DIR, "docs");
const IMAGES_DIR = join(TEST_DIR, "images");

/**
 * 模拟存储适配器（用于测试）
 */
class MockStorageAdapter implements IStorageAdapter {
  public uploadedFiles: Array<{ localPath: string; remotePath: string }> = [];

  async upload(localPath: string, remotePath: string): Promise<string> {
    this.uploadedFiles.push({ localPath, remotePath });
    return `https://cdn.example.com/${remotePath}`;
  }

  reset() {
    this.uploadedFiles = [];
  }
}

describe("@cmtx/upload", () => {
  let mockAdapter: MockStorageAdapter;

  beforeEach(async () => {
    mockAdapter = new MockStorageAdapter();

    // 创建测试目录结构
    await mkdir(DOCS_DIR, { recursive: true });
    await mkdir(IMAGES_DIR, { recursive: true });

    // 创建测试图片（空文件）
    await writeFile(join(IMAGES_DIR, "logo.png"), "fake-image-data");
    await writeFile(join(IMAGES_DIR, "banner.jpg"), "fake-banner-data");

    // 创建测试 Markdown 文件
    await writeFile(
      join(DOCS_DIR, "README.md"),
      "# Test\n\n![Logo](../images/logo.png)\n\n![Banner](../images/banner.jpg)"
    );

    await writeFile(
      join(DOCS_DIR, "guide.md"),
      "# Guide\n\n![Logo](../images/logo.png)"
    );
  });

  afterEach(async () => {
    // 清理测试目录
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  describe("analyzeImages", () => {
    it("应该分析本地图片引用", async () => {
      const result = await analyzeImages({
        workspace: {
          projectRoot: TEST_DIR,
          searchDir: DOCS_DIR,
        },
      });

      expect(result.totalCount).toBe(2);
      expect(result.images).toHaveLength(2);

      const logo = result.images.find((img) => img.localPath.includes("logo.png"));
      expect(logo).toBeDefined();
      expect(logo?.referencedIn).toHaveLength(2);

      const banner = result.images.find((img) => img.localPath.includes("banner.jpg"));
      expect(banner).toBeDefined();
      expect(banner?.referencedIn).toHaveLength(1);
    });

    it("应该过滤不符合扩展名的文件", async () => {
      await writeFile(join(IMAGES_DIR, "data.txt"), "text-data");
      await writeFile(
        join(DOCS_DIR, "test.md"),
        "# Test\n\n![Data](../images/data.txt)"
      );

      const result = await analyzeImages({
        workspace: {
          projectRoot: TEST_DIR,
          searchDir: DOCS_DIR,
        },
        allowedExtensions: [".png", ".jpg"],
      });

      expect(result.totalCount).toBe(2);
      expect(result.images.every((img) => !img.localPath.includes("data.txt"))).toBe(true);
    });
  });

  describe("uploadSingleImage", () => {
    it("应该上传单个图片并替换引用", async () => {
      const logoPath = join(IMAGES_DIR, "logo.png");

      const result = await uploadSingleImage(logoPath, {
        workspace: {
          projectRoot: TEST_DIR,
          searchDir: DOCS_DIR,
        },
        adapter: mockAdapter,
        replace: true,
      });

      expect(mockAdapter.uploadedFiles).toHaveLength(1);
      expect(mockAdapter.uploadedFiles[0].localPath).toBe(logoPath);

      expect(result.ossUrl).toContain("https://cdn.example.com/logo_");
      expect(result.originalName).toBe("logo.png");
      expect(result.fileSize).toBeGreaterThan(0);
      expect(result.replaceResults).toHaveLength(2);
    });

    it("应该支持上传前缀", async () => {
      const logoPath = join(IMAGES_DIR, "logo.png");

      await uploadSingleImage(logoPath, {
        workspace: {
          projectRoot: TEST_DIR,
          searchDir: DOCS_DIR,
        },
        adapter: mockAdapter,
        naming: { uploadPrefix: "blog/images" },
        replace: true,
      });

      expect(mockAdapter.uploadedFiles[0].remotePath).toContain("blog/images/logo_");
    });

    it("图片未被引用时应抛出错误", async () => {
      const orphanImage = join(IMAGES_DIR, "orphan.png");
      await writeFile(orphanImage, "orphan-data");

      await expect(
        uploadSingleImage(orphanImage, {
          workspace: {
            projectRoot: TEST_DIR,
            searchDir: DOCS_DIR,
          },
          adapter: mockAdapter,
          replace: true,
        })
      ).rejects.toThrow("No Markdown files reference this image");
    });
  });

  describe("uploadMultiImages", () => {
    it("应该批量上传所有本地图片", async () => {
      const results = await uploadMultiImages({
        workspace: {
          projectRoot: TEST_DIR,
          searchDir: DOCS_DIR,
        },
        adapter: mockAdapter,
        replace: true,
      });

      expect(results).toHaveLength(2);
      expect(mockAdapter.uploadedFiles).toHaveLength(2);
    });

    it("应该触发事件回调", async () => {
      const events: Array<{ type: string }> = [];

      await uploadMultiImages({
        workspace: {
          projectRoot: TEST_DIR,
          searchDir: DOCS_DIR,
        },
        adapter: mockAdapter,
        replace: true,
        hooks: {
          onEvent: (event: UploadEvent) => {
            events.push({ type: event.type });
          },
        },
      });

      const eventTypes = events.map((e) => e.type);
      expect(eventTypes).toContain("scan:start");
      expect(eventTypes).toContain("scan:complete");
      expect(eventTypes).toContain("upload:start");
      expect(eventTypes).toContain("complete");
    });

    it("单个文件失败不应中断流程", async () => {
      const failingAdapter: IStorageAdapter = {
        async upload(localPath) {
          if (localPath.includes("logo.png")) {
            throw new Error("Mock upload failure");
          }
          return `https://cdn.example.com/${localPath}`;
        },
      };

      const results = await uploadMultiImages({
        workspace: {
          projectRoot: TEST_DIR,
          searchDir: DOCS_DIR,
        },
        adapter: failingAdapter,
        replace: true,
      });

      expect(results).toHaveLength(1);
    });
  });

  describe("路径安全验证", () => {
    it("应该拒绝项目外的路径", async () => {
      await expect(
        uploadSingleImage("../../etc/passwd", {
          workspace: {
            projectRoot: TEST_DIR,
            searchDir: DOCS_DIR,
          },
          adapter: mockAdapter,
        })
      ).rejects.toThrow("Path must be within project root");
    });
  });

  describe("resolveNamingTemplate", () => {
    it("应该使用 MD5 前 8 位生成文件名", async () => {
      const testFile = join(IMAGES_DIR, "test-template.png");
      await writeFile(testFile, "test-content");

      const result = await resolveNamingTemplate(
        "{original}_{md5_8}{ext}",
        testFile
      );

      expect(result).toMatch(/^test-template_[a-f0-9]{8}\.png$/);
    });

    it("应该支持时间戳令牌", async () => {
      const testFile = join(IMAGES_DIR, "test-time.png");
      await writeFile(testFile, "test-content");

      const result = await resolveNamingTemplate(
        "{date}_{time}{ext}",
        testFile
      );

      expect(result).toMatch(/^202\d{5}_\d{6}\.png$/);
    });

    it("应该抛出未知令牌的错误", async () => {
      const testFile = join(IMAGES_DIR, "test-error.png");
      await writeFile(testFile, "test-content");

      try {
        await resolveNamingTemplate("{unknown}{ext}", testFile);
        expect.fail("应该抛出错误");
      } catch (error) {
        const message = (error as Error).message;
        expect(message).toContain("Available tokens:");
        expect(message).toContain("{original}");
        expect(message).toContain("{md5_8}");
      }
    });
  });

  // ===== 新增工具函数单元测试 =====
  describe("formatTimestamp", () => {
    it("应该格式化日期为正确的时间戳格式", async () => {
      const { formatTimestamp } = await import("../src/handlers/naming.js");
      const date = new Date("2026-01-26T14:30:25.123Z");
      const result = formatTimestamp(date);
      expect(result).toMatch(/^\d{8}-\d{6}-\d{3}$/);
      // 仅检查格式和毫秒部分，因为时区会影响具体时间
      expect(result.endsWith("-123")).toBe(true);
    });
  });

  describe("computeFileHash", () => {
    it("应该计算文件的 MD5 前 8 位哈希", async () => {
      const { computeFileHash } = await import("../src/handlers/naming.js");
      const testFile = join(IMAGES_DIR, "logo.png");
      const hash = await computeFileHash(testFile);
      expect(hash).toHaveLength(8);
      expect(/^[0-9a-f]{8}$/.test(hash)).toBe(true);
    });
  });

  describe("withRetry 工具", () => {
    it("应该成功执行操作而不需要重试", async () => {
      const { withRetry } = await import("../src/utils/retry.js");
      let callCount = 0;
      const result = await withRetry(
        async () => {
          callCount++;
          return "success";
        },
        undefined,
        { maxRetries: 2 }
      );
      expect(result.success).toBe(true);
      expect(result.result).toBe("success");
      expect(result.retries).toBe(0);
      expect(callCount).toBe(1);
    });

    it("应该在失败时重试", async () => {
      const { withRetry } = await import("../src/utils/retry.js");
      let callCount = 0;
      const result = await withRetry(
        async () => {
          callCount++;
          if (callCount < 3) throw new Error("Temporary error");
          return "success after retries";
        },
        undefined,
        { maxRetries: 3, baseDelayMs: 10 }
      );
      expect(result.success).toBe(true);
      expect(result.result).toBe("success after retries");
      expect(result.retries).toBe(2);
      expect(callCount).toBe(3);
    });

    it("应该在全部失败时返回错误", async () => {
      const { withRetry } = await import("../src/utils/retry.js");
      let callCount = 0;
      const result = await withRetry(
        async () => {
          callCount++;
          throw new Error("Persistent error");
        },
        undefined,
        { maxRetries: 1, baseDelayMs: 10 }
      );
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain("Persistent error");
      expect(callCount).toBe(2);
    });
  });
});
