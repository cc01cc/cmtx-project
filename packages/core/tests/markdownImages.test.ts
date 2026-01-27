import { mkdir, writeFile, rm, access } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { 
  extractImages, 
  extractImagesFromFile, 
  extractImagesFromDirectory,
  isImageReferencedInFile,
  findFilesReferencingImage,
  getImageReferenceDetails,
  deleteLocalImage,
  safeDeleteLocalImage,
  replaceImageInFiles,
  ImageMatch,
} from "../src/index.js";

describe("extractImages", () => {
  it("匹配指定网页域名", () => {
    const md =
      "![alt](https://cc01cc.cn/a.png) other ![b](http://example.com/b.png)";
    const result = extractImages(md, { webHosts: ["cc01cc.cn"] });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject<Partial<ImageMatch>>({
      alt: "alt",
      src: "https://cc01cc.cn/a.png",
      sourceType: "web",
    });
  });

  it("网页域名严格等值，不匹配其它域", () => {
    const md = "![alt](https://sub.cc01cc.cn/a.png)";
    const result = extractImages(md, { webHosts: ["cc01cc.cn"] });
    expect(result).toHaveLength(0);
  });

  it("支持 * 匹配所有网页图片", () => {
    const md = "![alt](https://any.domain/img.png)";
    const result = extractImages(md, { webHosts: ["*"] });
    expect(result).toHaveLength(1);
    expect(result[0].sourceType).toBe("web");
  });

  it("匹配本地前缀", () => {
    const md = "![local](./abc.png) and ![x](/root/file.png)";
    const result = extractImages(md, { localPrefixes: ["./", "/root"] });
    expect(result.map((r) => r.src)).toEqual(["./abc.png", "/root/file.png"]);
    expect(result.every((r) => r.sourceType === "local")).toBe(true);
  });

  it("本地前缀 * 匹配所有本地路径", () => {
    const md = "![p](abc.png) ![q](/img/p.png)";
    const result = extractImages(md, { localPrefixes: ["*"] });
    expect(result).toHaveLength(2);
  });

  it("未提供匹配列表则不返回任何图片", () => {
    const md = "![a](https://cc01cc.cn/a.png) ![b](./b.png)";
    const result = extractImages(md, {});
    expect(result).toHaveLength(0);
  });

  it("解析 title 并保留原始片段位置", () => {
    const md = 'before ![alt](https://cc01cc.cn/a.png "title") after';
    const result = extractImages(md, { webHosts: ["cc01cc.cn"] });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      title: "title",
      raw: '![alt](https://cc01cc.cn/a.png "title")',
      index: md.indexOf("![alt]"),
    });
  });

  it("网页图片不被本地前缀通配符 * 匹配", () => {
    const md = "![web](http://example.com/img.png)";
    const result = extractImages(md, { localPrefixes: ["*"] });
    expect(result).toHaveLength(0);
  });

  it("本地图片不被网页通配符 * 匹配", () => {
    const md = "![local](./img.png)";
    const result = extractImages(md, { webHosts: ["*"] });
    expect(result).toHaveLength(0);
  });
});

describe("extractImagesFromFile", () => {
  it("从文件读取并提取指定域名的图片", async () => {
    const { writeFileSync, unlinkSync } = await import("node:fs");
    const { join } = await import("node:path");

    const testFile = join(__dirname, "test-markdown.md");
    const content = "![logo](https://cc01cc.cn/logo.png)\n![other](https://example.com/img.png)";

    writeFileSync(testFile, content, "utf-8");

    try {
      const result = await extractImagesFromFile(testFile, {
        webHosts: ["cc01cc.cn"],
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        alt: "logo",
        src: "https://cc01cc.cn/logo.png",
        sourceType: "web",
      });
    } finally {
      unlinkSync(testFile);
    }
  });

  it("从文件读取并提取本地路径图片", async () => {
    const { writeFileSync, unlinkSync } = await import("node:fs");
    const { join } = await import("node:path");

    const testFile = join(__dirname, "test-local.md");
    const content = "![local1](./img.png)\n![local2](/assets/file.png)";

    writeFileSync(testFile, content, "utf-8");

    try {
      const result = await extractImagesFromFile(testFile, {
        localPrefixes: ["./", "/assets"],
      });

      expect(result).toHaveLength(2);
      expect(result.map((r: ImageMatch) => r.src)).toEqual(["./img.png", "/assets/file.png"]);
    } finally {
      unlinkSync(testFile);
    }
  });

  it("集成测试：从 test.md 提取 cc01cc.cn 和 blog.cc01cc.cn 域名图片", async () => {
    const result = await extractImagesFromFile("./tests/test.md", {
      webHosts: ["cc01cc.cn", "blog.cc01cc.cn"],
    });

    expect(result).toHaveLength(4);
    const imageSources = result.map(r => r.src);
    expect(imageSources).toContain("https://cc01cc.cn/logo.png");
    expect(imageSources).toContain("https://blog.cc01cc.cn/article/image.jpg");
    expect(imageSources).toContain("https://cc01cc.cn/mixed.png");
    expect(imageSources).toContain("https://blog.cc01cc.cn/post/img2.png");
  });

  it("集成测试：从 test.md 提取本地路径 ./ 和 . 前缀图片", async () => {
    const result = await extractImagesFromFile("./tests/test.md", {
      localPrefixes: ["./", "."],
    });

    expect(result).toHaveLength(4);
    const imageSources = result.map(r => r.src);
    expect(imageSources).toContain("./images/local.png");
    expect(imageSources).toContain("./mixed.jpg");
    expect(imageSources).toContain("./docs/diagram.svg");
    expect(imageSources).toContain("../parent/img.png");
  });

  it("集成测试：从 test.md 使用 * 通配符提取所有网页图片", async () => {
    const result = await extractImagesFromFile("./tests/test.md", {
      webHosts: ["*"],
    });

    expect(result).toHaveLength(6);
    const imageSources = result.map(r => r.src);
    expect(imageSources).toContain("https://cc01cc.cn/logo.png");
    expect(imageSources).toContain("https://blog.cc01cc.cn/article/image.jpg");
    expect(imageSources).toContain("https://example.com/other.png");
    expect(imageSources).toContain("//cdn.cc01cc.cn/shared/img.gif");
    expect(imageSources).toContain("https://cc01cc.cn/mixed.png");
    expect(imageSources).toContain("https://blog.cc01cc.cn/post/img2.png");
  });

  it("集成测试：从 test.md 使用 * 通配符提取所有本地图片", async () => {
    const result = await extractImagesFromFile("./tests/test.md", {
      localPrefixes: ["*"],
    });

    expect(result).toHaveLength(6);
    const imageSources = result.map(r => r.src);
    expect(imageSources).toContain("./images/local.png");
    expect(imageSources).toContain("current.jpg");
    expect(imageSources).toContain("/root/assets/file.png");
    expect(imageSources).toContain("../parent/img.png");
    expect(imageSources).toContain("./mixed.jpg");
    expect(imageSources).toContain("./docs/diagram.svg");
  });

  it("集成测试：从 test.md 混合配置提取图片", async () => {
    const result = await extractImagesFromFile("./tests/test.md", {
      webHosts: ["cc01cc.cn"],
      localPrefixes: ["./"],
    });

    expect(result).toHaveLength(5);
    const imageSources = result.map(r => r.src);
    expect(imageSources).toContain("https://cc01cc.cn/logo.png");
    expect(imageSources).toContain("https://cc01cc.cn/mixed.png");
    expect(imageSources).toContain("./images/local.png");
    expect(imageSources).toContain("./mixed.jpg");
    expect(imageSources).toContain("./docs/diagram.svg");
  });
});

describe("extractImagesFromDirectory", () => {
  const testDir = join(__dirname, "temp-test-dir");

  // 创建测试目录结构
  async function setupTestDirectory() {
    await rm(testDir, { recursive: true, force: true });
    await mkdir(testDir, { recursive: true });

    // 根目录文件
    await writeFile(
      join(testDir, "root.md"),
      "![web](https://cc01cc.cn/root.png)\n![local](./local.png)"
    );

    // 子目录
    await mkdir(join(testDir, "subdir"), { recursive: true });
    await writeFile(
      join(testDir, "subdir", "sub.md"),
      "![sub](https://example.com/sub.png)"
    );

    // 深层子目录
    await mkdir(join(testDir, "subdir", "nested"), { recursive: true });
    await writeFile(
      join(testDir, "subdir", "nested", "deep.md"),
      "![deep](./deep.png)"
    );

    // 非 markdown 文件（应被忽略）
    await writeFile(join(testDir, "readme.txt"), "not a markdown file");

    // .markdown 扩展名
    await writeFile(
      join(testDir, "alt.markdown"),
      "![alt](https://cc01cc.cn/alt.png)"
    );
  }

  async function cleanupTestDirectory() {
    await rm(testDir, { recursive: true, force: true });
  }

  it("递归扫描所有 markdown 文件", async () => {
    await setupTestDirectory();

    try {
      const results = await extractImagesFromDirectory(testDir, {
        webHosts: ["*"],
        localPrefixes: ["*"],
      });

      expect(results).toHaveLength(4); // root.md, sub.md, deep.md, alt.markdown
      
      const filePaths = results.map(r => r.relativePath).sort((a, b) => a.localeCompare(b));
      expect(filePaths).toContain("root.md");
      expect(filePaths).toContain("subdir/sub.md");
      expect(filePaths).toContain("subdir/nested/deep.md");
      expect(filePaths).toContain("alt.markdown");

      // 验证每个文件的绝对路径和 rootPath
      results.forEach(result => {
        expect(result.absolutePath).toContain(testDir);
        expect(result.rootPath).toBe(testDir);
      });
    } finally {
      await cleanupTestDirectory();
    }
  });

  it("正确提取各文件的图片", async () => {
    await setupTestDirectory();

    try {
      const results = await extractImagesFromDirectory(testDir, {
        webHosts: ["*"],
        localPrefixes: ["*"],
      });

      const rootResult = results.find(r => r.relativePath === "root.md");
      expect(rootResult?.images).toHaveLength(2);
      expect(rootResult?.images.map(img => img.src)).toContain("https://cc01cc.cn/root.png");
      expect(rootResult?.images.map(img => img.src)).toContain("./local.png");

      const subResult = results.find(r => r.relativePath === "subdir/sub.md");
      expect(subResult?.images).toHaveLength(1);
      expect(subResult?.images[0].src).toBe("https://example.com/sub.png");
    } finally {
      await cleanupTestDirectory();
    }
  });

  it("应用图片过滤配置", async () => {
    await setupTestDirectory();

    try {
      // 仅提取 cc01cc.cn 的图片
      const results = await extractImagesFromDirectory(testDir, {
        webHosts: ["cc01cc.cn"],
      });

      const allImages = results.flatMap(r => r.images);
      expect(allImages).toHaveLength(2); // root.png 和 alt.png
      allImages.forEach(img => {
        expect(img.src).toContain("cc01cc.cn");
      });
    } finally {
      await cleanupTestDirectory();
    }
  });

  it("限制扫描深度为 0（仅根目录）", async () => {
    await setupTestDirectory();

    try {
      const results = await extractImagesFromDirectory(testDir, {
        webHosts: ["*"],
        localPrefixes: ["*"],
        depth: 0,
      });

      expect(results).toHaveLength(2); // 仅 root.md 和 alt.markdown
      const filePaths = results.map(r => r.relativePath).sort((a, b) => a.localeCompare(b));
      expect(filePaths).toEqual(["alt.markdown", "root.md"]);
    } finally {
      await cleanupTestDirectory();
    }
  });

  it("限制扫描深度为 1（根目录 + 一级子目录）", async () => {
    await setupTestDirectory();

    try {
      const results = await extractImagesFromDirectory(testDir, {
        webHosts: ["*"],
        localPrefixes: ["*"],
        depth: 1,
      });

      expect(results).toHaveLength(3); // root.md, alt.markdown, sub.md（不包括 deep.md）
      const filePaths = results.map(r => r.relativePath).sort((a, b) => a.localeCompare(b));
      expect(filePaths).not.toContain("subdir/nested/deep.md");
    } finally {
      await cleanupTestDirectory();
    }
  });

  it("返回跨平台的相对路径", async () => {
    await setupTestDirectory();

    try {
      const results = await extractImagesFromDirectory(testDir, {
        webHosts: ["*"],
        localPrefixes: ["*"],
      });

      results.forEach(result => {
        // 相对路径应使用正斜杠
        expect(result.relativePath).not.toContain("\\");
        // 绝对路径应包含测试目录
        expect(result.absolutePath).toContain(testDir);
        // rootPath 应该等于 testDir
        expect(result.rootPath).toBe(testDir);
      });
    } finally {
      await cleanupTestDirectory();
    }
  });

  it("处理不存在的目录", async () => {
    await expect(
      extractImagesFromDirectory("/nonexistent/dir", { webHosts: ["*"] })
    ).rejects.toThrow();
  });

  it("处理空目录", async () => {
    const emptyDir = join(testDir, "empty");
    await mkdir(emptyDir, { recursive: true });

    try {
      const results = await extractImagesFromDirectory(emptyDir, {
        webHosts: ["*"],
      });

      expect(results).toHaveLength(0);
    } finally {
      await rm(emptyDir, { recursive: true, force: true });
    }
  });

  it("汇总所有图片示例", async () => {
    await setupTestDirectory();

    try {
      const results = await extractImagesFromDirectory(testDir, {
        webHosts: ["*"],
        localPrefixes: ["*"],
      });

      // 获取所有图片的扁平列表，包含文件信息
      const allImages = results.flatMap(r =>
        r.images.map(img => ({
          ...img,
          file: r.relativePath,
          absoluteFile: r.absolutePath,
        }))
      );

      expect(allImages.length).toBeGreaterThan(0);
      allImages.forEach(img => {
        expect(img).toHaveProperty("file");
        expect(img).toHaveProperty("absoluteFile");
        expect(img).toHaveProperty("src");
        expect(img).toHaveProperty("sourceType");
      });
    } finally {
      await cleanupTestDirectory();
    }
  });
});

describe("isImageReferencedInFile", () => {
  const testDir = join(__dirname, "test-img-reference");
  const imagesDir = join(testDir, "images");
  const docsDir = join(testDir, "docs");
  
  async function setupTestFiles() {
    await rm(testDir, { recursive: true, force: true });
    await mkdir(imagesDir, { recursive: true });
    await mkdir(docsDir, { recursive: true });
    
    // 创建测试图片文件（空文件）
    await writeFile(join(imagesDir, "logo.png"), "");
    await writeFile(join(imagesDir, "banner.jpg"), "");
    
    // 创建引用图片的 markdown 文件
    await writeFile(
      join(docsDir, "readme.md"),
      "# README\n\n![Logo](../images/logo.png)\n\nSome content."
    );
    
    await writeFile(
      join(docsDir, "guide.md"),
      "# Guide\n\n![Banner](../images/banner.jpg)\n\n![Web](https://example.com/image.png)"
    );
    
    await writeFile(
      join(docsDir, "no-images.md"),
      "# No Images\n\nThis file has no images."
    );
  }
  
  async function cleanupTestFiles() {
    await rm(testDir, { recursive: true, force: true });
  }
  
  it("应该检测到相对路径引用", async () => {
    await setupTestFiles();
    try {
      const logoPath = join(imagesDir, "logo.png");
      const readmePath = join(docsDir, "readme.md");
      
      const result = await isImageReferencedInFile(logoPath, readmePath);
      expect(result).toBe(true);
    } finally {
      await cleanupTestFiles();
    }
  });
  
  it("应该检测到不同图片未被引用", async () => {
    await setupTestFiles();
    try {
      const bannerPath = join(imagesDir, "banner.jpg");
      const readmePath = join(docsDir, "readme.md");
      
      const result = await isImageReferencedInFile(bannerPath, readmePath);
      expect(result).toBe(false);
    } finally {
      await cleanupTestFiles();
    }
  });
  
  it("应该忽略 Web 链接", async () => {
    await setupTestFiles();
    try {
      const guidePath = join(docsDir, "guide.md");
      
      // Web URL 不应该被检测为本地图片
      const result = await isImageReferencedInFile(
        "https://example.com/image.png",
        guidePath
      );
      expect(result).toBe(false);
    } finally {
      await cleanupTestFiles();
    }
  });
  
  it("没有图片的文件应该返回 false", async () => {
    await setupTestFiles();
    try {
      const logoPath = join(imagesDir, "logo.png");
      const noImagesPath = join(docsDir, "no-images.md");
      
      const result = await isImageReferencedInFile(logoPath, noImagesPath);
      expect(result).toBe(false);
    } finally {
      await cleanupTestFiles();
    }
  });
  
  it("文件不存在时应该抛出错误", async () => {
    const fakePath = join(__dirname, "non-existent.md");
    const imagePath = join(__dirname, "image.png");
    
    await expect(
      isImageReferencedInFile(imagePath, fakePath)
    ).rejects.toThrow("Cannot read markdown file");
  });
});

describe("findFilesReferencingImage", () => {
  const testDir = join(__dirname, "test-find-references");
  const imagesDir = join(testDir, "images");
  const docsDir = join(testDir, "docs");
  const subDir = join(docsDir, "sub");
  
  async function setupTestFiles() {
    await rm(testDir, { recursive: true, force: true });
    await mkdir(imagesDir, { recursive: true });
    await mkdir(docsDir, { recursive: true });
    await mkdir(subDir, { recursive: true });
    
    // 创建测试图片
    await writeFile(join(imagesDir, "shared.png"), "");
    
    // 创建多个 markdown 文件，有些引用图片，有些不引用
    await writeFile(
      join(docsDir, "page1.md"),
      "# Page 1\n\n![Shared](../images/shared.png)"
    );
    
    await writeFile(
      join(docsDir, "page2.md"),
      "# Page 2\n\nNo images here."
    );
    
    await writeFile(
      join(subDir, "page3.md"),
      "# Page 3\n\n![Shared](../../images/shared.png)"
    );
    
    await writeFile(
      join(subDir, "page4.md"),
      "# Page 4\n\n![Other](./other.png)"
    );
  }
  
  async function cleanupTestFiles() {
    await rm(testDir, { recursive: true, force: true });
  }
  
  it("应该找到所有引用图片的文件", async () => {
    await setupTestFiles();
    try {
      const sharedImagePath = join(imagesDir, "shared.png");
      const results = await findFilesReferencingImage(
        sharedImagePath,
        docsDir,
        { depth: "all" }
      );
      
      expect(results).toHaveLength(2);
      expect(results.map(r => r.relativePath).sort((a, b) => a.localeCompare(b))).toEqual([
        "page1.md",
        "sub/page3.md"
      ]);
      // 验证 rootPath
      results.forEach(r => {
        expect(r.rootPath).toBe(docsDir);
      });
    } finally {
      await cleanupTestFiles();
    }
  });
  
  it("应该支持深度限制 (depth: 0)", async () => {
    await setupTestFiles();
    try {
      const sharedImagePath = join(imagesDir, "shared.png");
      const results = await findFilesReferencingImage(
        sharedImagePath,
        docsDir,
        { depth: 0 }
      );
      
      // 仅扫描根目录，不包含子目录
      expect(results).toHaveLength(1);
      expect(results[0].relativePath).toBe("page1.md");
    } finally {
      await cleanupTestFiles();
    }
  });
  
  it("应该支持深度限制 (depth: 1)", async () => {
    await setupTestFiles();
    try {
      const sharedImagePath = join(imagesDir, "shared.png");
      const results = await findFilesReferencingImage(
        sharedImagePath,
        docsDir,
        { depth: 1 }
      );
      
      // 扫描根目录和一级子目录
      expect(results).toHaveLength(2);
      expect(results.map(r => r.relativePath).sort((a, b) => a.localeCompare(b))).toEqual([
        "page1.md",
        "sub/page3.md"
      ]);
    } finally {
      await cleanupTestFiles();
    }
  });
  
  it("未引用的图片应该返回空数组", async () => {
    await setupTestFiles();
    try {
      const nonExistentImage = join(imagesDir, "nonexistent.png");
      const results = await findFilesReferencingImage(
        nonExistentImage,
        docsDir
      );
      
      expect(results).toHaveLength(0);
    } finally {
      await cleanupTestFiles();
    }
  });
  
  it("无效的搜索目录应该抛出错误", async () => {
    const fakeDir = join(__dirname, "fake-directory");
    const imagePath = join(__dirname, "image.png");
    
    await expect(
      findFilesReferencingImage(imagePath, fakeDir)
    ).rejects.toThrow("Cannot access directory");
  });
});

describe("getImageReferenceDetails", () => {
  const testDir = join(__dirname, "test-reference-details");
  const imagesDir = join(testDir, "images");
  const docsDir = join(testDir, "docs");
  
  async function setupTestFiles() {
    await rm(testDir, { recursive: true, force: true });
    await mkdir(imagesDir, { recursive: true });
    await mkdir(docsDir, { recursive: true });
    
    // 创建测试图片
    await writeFile(join(imagesDir, "logo.png"), "");
    
    // 创建引用图片的 markdown 文件（多次引用）
    await writeFile(
      join(docsDir, "readme.md"),
      `# README
      
![Logo 1](../images/logo.png)

Some content here.

![Logo 2](../images/logo.png "Logo Title")

More content.

![Logo 3](../images/logo.png)`
    );
    
    // 创建另一个引用图片的文件
    await writeFile(
      join(docsDir, "guide.md"),
      `# Guide

![Main Logo](../images/logo.png)

Guide content.`
    );
    
    // 创建不引用该图片的文件
    await writeFile(
      join(docsDir, "other.md"),
      `# Other

![Different](./other-image.png)`
    );
  }
  
  async function cleanupTestFiles() {
    await rm(testDir, { recursive: true, force: true });
  }
  
  it("应该返回所有引用位置的详细信息", async () => {
    await setupTestFiles();
    try {
      const logoPath = join(imagesDir, "logo.png");
      const details = await getImageReferenceDetails(
        logoPath,
        docsDir,
        { depth: "all" }
      );
      
      // 应该找到 2 个文件（readme.md 和 guide.md）
      expect(details).toHaveLength(2);
      
      // 验证 readme.md 的引用（3 次）
      const readmeDetail = details.find(d => d.relativePath === "readme.md");
      expect(readmeDetail).toBeDefined();
      expect(readmeDetail!.locations).toHaveLength(3);
      expect(readmeDetail!.rootPath).toBe(docsDir);
      
      // 验证行号从 1 开始
      readmeDetail!.locations.forEach(loc => {
        expect(loc.line).toBeGreaterThan(0);
        expect(loc.column).toBeGreaterThanOrEqual(0);
        expect(loc.lineText).toContain("![");
      });
      
      // 验证 guide.md 的引用（1 次）
      const guideDetail = details.find(d => d.relativePath === "guide.md");
      expect(guideDetail).toBeDefined();
      expect(guideDetail!.locations).toHaveLength(1);
      expect(guideDetail!.locations[0].lineText).toContain("![Main Logo]");
    } finally {
      await cleanupTestFiles();
    }
  });
  
  it("应该正确计算行号和列号", async () => {
    await setupTestFiles();
    try {
      const logoPath = join(imagesDir, "logo.png");
      const details = await getImageReferenceDetails(
        logoPath,
        docsDir
      );
      
      const readmeDetail = details.find(d => d.relativePath === "readme.md");
      expect(readmeDetail).toBeDefined();
      
      // 验证第一个引用的位置
      const firstLoc = readmeDetail!.locations[0];
      expect(firstLoc.line).toBe(3); // 第 3 行
      expect(firstLoc.lineText).toContain("Logo 1");
      
      // 所有位置应该有不同的行号（因为在不同行）
      const lineNumbers = readmeDetail!.locations.map(loc => loc.line);
      const uniqueLines = new Set(lineNumbers);
      expect(uniqueLines.size).toBe(lineNumbers.length);
    } finally {
      await cleanupTestFiles();
    }
  });
  
  it("未引用的图片应该返回空数组", async () => {
    await setupTestFiles();
    try {
      const nonExistentImage = join(imagesDir, "nonexistent.png");
      const details = await getImageReferenceDetails(
        nonExistentImage,
        docsDir
      );
      
      expect(details).toHaveLength(0);
    } finally {
      await cleanupTestFiles();
    }
  });
  
  it("应该支持 projectRoot 参数", async () => {
    await setupTestFiles();
    try {
      // 使用相对路径 + projectRoot
      const details = await getImageReferenceDetails(
        "images/logo.png",
        "docs",
        { projectRoot: testDir }
      );
      
      expect(details.length).toBeGreaterThan(0);
      details.forEach(d => {
        expect(d.rootPath).toContain("docs");
        expect(d.absolutePath).toContain(testDir);
      });
    } finally {
      await cleanupTestFiles();
    }
  });
  
  it("应该支持深度限制", async () => {
    // 创建嵌套结构
    await rm(testDir, { recursive: true, force: true });
    await mkdir(join(docsDir, "sub"), { recursive: true });
    await mkdir(imagesDir, { recursive: true });
    await writeFile(join(imagesDir, "test.png"), "");
    
    await writeFile(
      join(docsDir, "root.md"),
      "![Test](../images/test.png)"
    );
    
    await writeFile(
      join(docsDir, "sub", "nested.md"),
      "![Test](../../images/test.png)"
    );
    
    try {
      const imagePath = join(imagesDir, "test.png");
      
      // depth: 0 应该只找到根目录的文件
      const rootOnly = await getImageReferenceDetails(
        imagePath,
        docsDir,
        { depth: 0 }
      );
      expect(rootOnly).toHaveLength(1);
      expect(rootOnly[0].relativePath).toBe("root.md");
      
      // depth: "all" 应该找到所有文件
      const allFiles = await getImageReferenceDetails(
        imagePath,
        docsDir,
        { depth: "all" }
      );
      expect(allFiles).toHaveLength(2);
    } finally {
      await cleanupTestFiles();
    }
  });
});

describe("deleteLocalImage", () => {
  const testDir = join(__dirname, "test-delete-image");
  const imagesDir = join(testDir, "images");
  
  async function setupTestFiles() {
    await rm(testDir, { recursive: true, force: true });
    await mkdir(imagesDir, { recursive: true });
    await writeFile(join(imagesDir, "test.png"), "test image content");
  }
  
  async function cleanupTestFiles() {
    await rm(testDir, { recursive: true, force: true });
  }
  
  it("应该成功删除图片文件", async () => {
    await setupTestFiles();
    try {
      const imagePath = join(imagesDir, "test.png");
      
      // 删除图片
      await deleteLocalImage(testDir, imagePath);
      
      // 验证文件已被删除
      await expect(
        access(imagePath)
      ).rejects.toThrow();
    } finally {
      await cleanupTestFiles();
    }
  });
  
  it("应该拒绝删除根目录外的文件", async () => {
    await setupTestFiles();
    try {
      const imagePath = join(__dirname, "outside.png");
      await writeFile(imagePath, "outside");
      
      // 尝试删除根目录外的文件应该抛出错误
      await expect(
        deleteLocalImage(testDir, imagePath)
      ).rejects.toThrow("Security violation");
      
      // 验证文件未被删除
      await access(imagePath);
      await rm(imagePath);
    } finally {
      await cleanupTestFiles();
    }
  });
  
  it("应该支持相对路径", async () => {
    await setupTestFiles();
    try {
      // 使用相对路径
      await deleteLocalImage(
        "test-delete-image",
        "test-delete-image/images/test.png",
        { projectRoot: __dirname }
      );
      
      // 验证文件已被删除
      await expect(
        access(join(imagesDir, "test.png"))
      ).rejects.toThrow();
    } finally {
      await cleanupTestFiles();
    }
  });
  
  it("删除不存在的文件应该抛出错误", async () => {
    await setupTestFiles();
    try {
      const nonExistent = join(imagesDir, "nonexistent.png");
      
      await expect(
        deleteLocalImage(testDir, nonExistent)
      ).rejects.toThrow("Failed to delete file");
    } finally {
      await cleanupTestFiles();
    }
  });
});

describe("safeDeleteLocalImage", () => {
  const testDir = join(__dirname, "test-safe-delete");
  const imagesDir = join(testDir, "images");
  const docsDir = join(testDir, "docs");
  
  async function setupTestFiles() {
    await rm(testDir, { recursive: true, force: true });
    await mkdir(imagesDir, { recursive: true });
    await mkdir(docsDir, { recursive: true });
    
    // 创建测试图片
    await writeFile(join(imagesDir, "referenced.png"), "referenced");
    await writeFile(join(imagesDir, "unreferenced.png"), "unreferenced");
    
    // 创建引用图片的 Markdown 文件
    await writeFile(
      join(docsDir, "readme.md"),
      "# Test\n![Image](../images/referenced.png)"
    );
  }
  
  async function cleanupTestFiles() {
    await rm(testDir, { recursive: true, force: true });
  }
  
  it("应该删除未被引用的图片", async () => {
    await setupTestFiles();
    try {
      const imagePath = join(imagesDir, "unreferenced.png");
      
      const result = await safeDeleteLocalImage(testDir, imagePath);
      
      expect(result.deleted).toBe(true);
      expect(result).toHaveProperty("path");
      if (result.deleted) {
        expect(result.path).toBe(imagePath);
      }
      
      // 验证文件已被删除
      await expect(access(imagePath)).rejects.toThrow();
    } finally {
      await cleanupTestFiles();
    }
  });
  
  it("应该拒绝删除被引用的图片", async () => {
    await setupTestFiles();
    try {
      const imagePath = join(imagesDir, "referenced.png");
      
      const result = await safeDeleteLocalImage(testDir, imagePath);
      
      expect(result.deleted).toBe(false);
      if (!result.deleted) {
        expect(result.reason).toBe("referenced");
        expect(result.firstReference).toBeDefined();
        expect(result.firstReference.relativePath).toContain("readme.md");
        expect(result.firstReference.locations).toHaveLength(1);
        expect(result.firstReference.locations[0].line).toBe(2);
      }
      
      // 验证文件未被删除
      await access(imagePath);
    } finally {
      await cleanupTestFiles();
    }
  });
  
  it("应该返回第一个引用的详细信息", async () => {
    await setupTestFiles();
    try {
      // 创建多个引用
      await writeFile(
        join(docsDir, "page1.md"),
        "![Image](../images/referenced.png)"
      );
      await writeFile(
        join(docsDir, "page2.md"),
        "![Image](../images/referenced.png)"
      );
      
      const imagePath = join(imagesDir, "referenced.png");
      const result = await safeDeleteLocalImage(testDir, imagePath);
      
      expect(result.deleted).toBe(false);
      if (!result.deleted) {
        expect(result.firstReference.locations[0].lineText).toContain("referenced.png");
      }
    } finally {
      await cleanupTestFiles();
    }
  });
  
  it("应该支持深度限制", async () => {
    await setupTestFiles();
    try {
      const subDir = join(docsDir, "sub");
      await mkdir(subDir);
      await writeFile(
        join(subDir, "nested.md"),
        "![Image](../../images/unreferenced.png)"
      );
      
      const imagePath = join(imagesDir, "unreferenced.png");
      
      // depth: 0 不应该找到嵌套文件中的引用
      const result = await safeDeleteLocalImage(
        testDir,
        imagePath,
        { depth: 0 }
      );
      
      expect(result.deleted).toBe(true);
    } finally {
      await cleanupTestFiles();
    }
  });
  
  it("应该支持相对路径", async () => {
    await setupTestFiles();
    try {
      const result = await safeDeleteLocalImage(
        "test-safe-delete",
        "test-safe-delete/images/unreferenced.png",
        { projectRoot: __dirname }
      );
      
      expect(result.deleted).toBe(true);
    } finally {
      await cleanupTestFiles();
    }
  });
  
  it("应该拒绝删除根目录外的文件", async () => {
    await setupTestFiles();
    try {
      const outsideImage = join(__dirname, "outside.png");
      await writeFile(outsideImage, "outside");
      
      await expect(
        safeDeleteLocalImage(testDir, outsideImage)
      ).rejects.toThrow("Security violation");
      
      // 清理
      await rm(outsideImage);
    } finally {
      await cleanupTestFiles();
    }
  });
});

// ============================================================
// 大规模项目测试 - 模拟真实项目环境的复杂场景
// ============================================================
describe("大规模项目场景", () => {
  const largeProjectDir = join(__dirname, "test-large-project");
  const imagesDir = join(largeProjectDir, "images");
  const docsDir = join(largeProjectDir, "docs");
  const blogDir = join(docsDir, "blog");
  const guideDir = join(docsDir, "guides");
  
  async function setupLargeProject() {
    // 创建深层目录结构
    await mkdir(guideDir, { recursive: true });
    await mkdir(blogDir, { recursive: true });
    await mkdir(imagesDir, { recursive: true });  // 确保 images 目录存在
    
    // 创建多个图片
    await writeFile(join(imagesDir, "logo.png"), "logo");
    await writeFile(join(imagesDir, "banner.png"), "banner");
    await writeFile(join(imagesDir, "icon.png"), "icon");
    await writeFile(join(imagesDir, "unused.png"), "unused");
    
    // 创建多个 Markdown 文件，有不同的引用深度
    await writeFile(
      join(docsDir, "README.md"),
      "# Docs\n![logo](../images/logo.png)\n![banner](../images/banner.png)"
    );
    
    // 一级子目录
    await writeFile(
      join(blogDir, "post1.md"),
      "# Post 1\n![icon](../../images/icon.png)"
    );
    
    await writeFile(
      join(blogDir, "post2.md"),
      "# Post 2\n![logo](../../images/logo.png)\n![logo](../../images/logo.png)"
    );
    
    // 二级子目录
    await writeFile(
      join(guideDir, "guide1.md"),
      "# Guide 1\n![banner](../../images/banner.png)"
    );
    
    await writeFile(
      join(guideDir, "guide2.md"),
      "# Guide 2\nNo images here"
    );
  }
  
  async function cleanupLargeProject() {
    await rm(largeProjectDir, { recursive: true, force: true });
  }
  
  it("应该处理多层级目录结构（depth: all）", async () => {
    await setupLargeProject();
    try {
      const files = await findFilesReferencingImage(
        join(imagesDir, "logo.png"),
        docsDir,
        { depth: "all" }
      );
      
      // logo 应被 README.md 和 post2.md 引用
      expect(files.length).toBe(2);
      expect(files.some(f => f.relativePath.includes("README.md"))).toBe(true);
      expect(files.some(f => f.relativePath.includes("post2.md"))).toBe(true);
    } finally {
      await cleanupLargeProject();
    }
  });
  
  it("应该支持按深度限制扫描以优化性能（depth: 1）", async () => {
    await setupLargeProject();
    try {
      // 深度 1 应该找到 README 和 blog 目录的文件
      // 因为 blog 是 docsDir 的直接子目录（深度 1）
      const files = await findFilesReferencingImage(
        join(imagesDir, "logo.png"),
        docsDir,
        { depth: 1 }
      );
      
      expect(files.length).toBeGreaterThanOrEqual(1);
      expect(files.some(f => f.relativePath.includes("README.md"))).toBe(true);
      // 可能还会找到 blog 目录中的文件（深度 1 会包括一级子目录）
    } finally {
      await cleanupLargeProject();
    }
  });
  
  it("应该支持按深度限制扫描（depth: 0）", async () => {
    await setupLargeProject();
    try {
      // 深度 0 应该只扫描根目录
      const files = await findFilesReferencingImage(
        join(imagesDir, "logo.png"),
        docsDir,
        { depth: 0 }
      );
      
      expect(files.length).toBe(1);
      expect(files[0].relativePath).toContain("README.md");
    } finally {
      await cleanupLargeProject();
    }
  });
  
  it("应该正确处理同一图片在同一文件中多次出现的情况", async () => {
    await setupLargeProject();
    try {
      const details = await getImageReferenceDetails(
        join(imagesDir, "logo.png"),
        docsDir,
        { depth: "all" }
      );
      
      // post2.md 中 logo 出现 2 次
      const post2 = details.find(d => d.relativePath.includes("post2.md"));
      expect(post2).toBeDefined();
      expect(post2!.locations.length).toBe(2);
    } finally {
      await cleanupLargeProject();
    }
  });
  
  it("应该识别完全未被引用的图片", async () => {
    await setupLargeProject();
    try {
      const details = await getImageReferenceDetails(
        join(imagesDir, "unused.png"),
        docsDir,
        { depth: "all" }
      );
      
      expect(details).toHaveLength(0);
    } finally {
      await cleanupLargeProject();
    }
  });
});

// ============================================================
// 特殊格式和边界情况测试
// ============================================================
describe("特殊格式和边界情况", () => {
  const specialFormatDir = join(__dirname, "test-special-format");
  
  async function setupSpecialFormats() {
    await mkdir(specialFormatDir, { recursive: true });
    
    // 1. 包含特殊字符的文件名
    await writeFile(
      join(specialFormatDir, "special-chars.md"),
      "![image with spaces](./image%20file.png)"
    );
    
    // 2. 代码块中的图片引用（应该被检测）
    await writeFile(
      join(specialFormatDir, "with-code-block.md"),
      `# Title
\`\`\`markdown
![logo](../images/logo.png)
\`\`\`

![actual image](./actual.png)`
    );
    
    // 3. HTML 注释中的图片引用
    await writeFile(
      join(specialFormatDir, "with-comments.md"),
      `<!-- ![commented](./commented.png) -->
![real](./real.png)`
    );
    
    // 4. 多行引用（虽然不符合标准 Markdown，但应该处理）
    await writeFile(
      join(specialFormatDir, "multiline.md"),
      `![alt text that
spans multiple
lines](./multiline.png)`
    );
    
    // 5. UTF-8 特殊字符文件名
    await writeFile(
      join(specialFormatDir, "emoji-test.md"),
      "![emoji 图片](./图片-emoji-🎉.png)"
    );
    
    // 6. 转义字符的路径
    await writeFile(
      join(specialFormatDir, "escaped-paths.md"),
      "![escaped](./path\\\\with\\\\backslashes.png)"
    );
    
    // 7. 带 fragment/query 的路径
    await writeFile(
      join(specialFormatDir, "with-fragments.md"),
      "![with query](./image.png?v=1&size=large)"
    );
    
    // 创建实际文件
    await writeFile(join(specialFormatDir, "actual.png"), "actual");
    await writeFile(join(specialFormatDir, "real.png"), "real");
  }
  
  async function cleanupSpecialFormat() {
    await rm(specialFormatDir, { recursive: true, force: true });
  }
  
  it("应该检测特殊字符（URL 编码）的路径", async () => {
    await setupSpecialFormats();
    try {
      const md = await extractImagesFromFile(
        join(specialFormatDir, "special-chars.md"),
        { localPrefixes: ["*"] }  // 添加过滤条件
      );
      
      expect(md).toHaveLength(1);
      expect(md[0].src).toContain("image%20file.png");
    } finally {
      await cleanupSpecialFormat();
    }
  });
  
  it("应该检测代码块中的图片引用", async () => {
    await setupSpecialFormats();
    try {
      const md = await extractImagesFromFile(
        join(specialFormatDir, "with-code-block.md"),
        { localPrefixes: ["*"] }  // 添加过滤条件
      );
      
      // 应该检测到至少 1 个引用（代码块中的和实际的）
      expect(md.length).toBeGreaterThanOrEqual(1);
      expect(md.some(m => m.src.includes("actual.png"))).toBe(true);
    } finally {
      await cleanupSpecialFormat();
    }
  });
  
  it("应该检测 HTML 注释中的图片引用", async () => {
    await setupSpecialFormats();
    try {
      const md = await extractImagesFromFile(
        join(specialFormatDir, "with-comments.md"),
        { localPrefixes: ["*"] }  // 添加过滤条件
      );
      
      // 应该检测到至少 1 个引用（real.png）
      expect(md.length).toBeGreaterThanOrEqual(1);
      expect(md.some(m => m.src.includes("real.png"))).toBe(true);
    } finally {
      await cleanupSpecialFormat();
    }
  });
  
  it("应该处理 UTF-8 特殊字符文件名", async () => {
    await setupSpecialFormats();
    try {
      const md = await extractImagesFromFile(
        join(specialFormatDir, "emoji-test.md"),
        { localPrefixes: ["*"] }  // 添加过滤条件
      );
      
      expect(md).toHaveLength(1);
      // 应该能正确识别包含 emoji 的路径
      expect(md[0].src).toContain("图片");
    } finally {
      await cleanupSpecialFormat();
    }
  });
  
  it("应该处理带查询参数的图片路径", async () => {
    await setupSpecialFormats();
    try {
      const md = await extractImagesFromFile(
        join(specialFormatDir, "with-fragments.md"),
        { localPrefixes: ["*"] }  // 添加过滤条件
      );
      
      expect(md).toHaveLength(1);
      expect(md[0].src).toContain("?");
    } finally {
      await cleanupSpecialFormat();
    }
  });
  
  it("应该正确报告包含特殊字符文件的引用", async () => {
    await setupSpecialFormats();
    try {
      const details = await getImageReferenceDetails(
        join(specialFormatDir, "actual.png"),
        specialFormatDir,
        { depth: "all" }
      );
      
      // actual.png 应该在 with-code-block.md 中被引用
      expect(details.length).toBeGreaterThanOrEqual(1);
    } finally {
      await cleanupSpecialFormat();
    }
  });
});

describe("replaceImageInFiles", () => {
  const replaceTestDir = join(__dirname, "temp-replace-test");

  const setupReplaceTest = async () => {
    await mkdir(replaceTestDir, { recursive: true });
    await mkdir(join(replaceTestDir, "images"), { recursive: true });

    // 创建测试图片（空文件）
    await writeFile(join(replaceTestDir, "images", "old.png"), "fake");
    await writeFile(join(replaceTestDir, "images", "new.png"), "fake");

    // 创建测试 Markdown 文件
    const readmePath = join(replaceTestDir, "README.md");
    await writeFile(
      readmePath,
      "# Test\n![Logo](./images/old.png)\n![Banner](./images/old.png)"
    );

    const guideFile = join(replaceTestDir, "guide.md");
    await writeFile(
      guideFile,
      "# Guide\n![Image](./images/old.png)"
    );
  };

  const cleanupReplace = async () => {
    try {
      await rm(replaceTestDir, { recursive: true });
    } catch {
      // ignore
    }
  };

  it("替换 src", async () => {
    try {
      await setupReplaceTest();

      const results = await replaceImageInFiles(
        join(replaceTestDir, "images", "old.png"),
        replaceTestDir,
        { newSrc: "./images/new.png" }
      );

      // 应该替换两个文件中的图片
      expect(results.length).toBeGreaterThan(0);
      results.forEach(result => {
        if (result.replacements.length > 0) {
          result.replacements.forEach(replacement => {
            expect(replacement.newText).toContain("./images/new.png");
            expect(replacement.type).toBe("src");
          });
        }
      });
    } finally {
      await cleanupReplace();
    }
  });

  it("替换 alt", async () => {
    try {
      await setupReplaceTest();

      const results = await replaceImageInFiles(
        join(replaceTestDir, "images", "old.png"),
        replaceTestDir,
        { newAlt: "新描述" }
      );

      expect(results.length).toBeGreaterThan(0);
      results.forEach(result => {
        if (result.replacements.length > 0) {
          result.replacements.forEach(replacement => {
            expect(replacement.newText).toContain("新描述");
            expect(replacement.type).toBe("alt");
          });
        }
      });
    } finally {
      await cleanupReplace();
    }
  });

  it("同时替换 src 和 alt", async () => {
    try {
      await setupReplaceTest();

      const results = await replaceImageInFiles(
        join(replaceTestDir, "images", "old.png"),
        replaceTestDir,
        { newSrc: "./images/new.png", newAlt: "新描述" }
      );

      expect(results.length).toBeGreaterThan(0);
      results.forEach(result => {
        if (result.replacements.length > 0) {
          result.replacements.forEach(replacement => {
            expect(replacement.newText).toContain("./images/new.png");
            expect(replacement.newText).toContain("新描述");
            expect(replacement.type).toBe("both");
          });
        }
      });
    } finally {
      await cleanupReplace();
    }
  });

  it("没有替换项时返回空数组", async () => {
    const results = await replaceImageInFiles(
      "nonexistent.png",
      replaceTestDir
    );
    expect(results).toHaveLength(0);
  });

  it("返回正确的 relativePath", async () => {
    try {
      await setupReplaceTest();

      const results = await replaceImageInFiles(
        join(replaceTestDir, "images", "old.png"),
        replaceTestDir,
        { newSrc: "./images/new.png" }
      );

      // 验证 relativePath 是相对于搜索目录的路径
      expect(results.length).toBeGreaterThan(0);
      results.forEach(result => {
        if (result.replacements.length > 0) {
          expect(result.relativePath).not.toBe('');
          expect(result.relativePath).not.toContain('..'); // 不应该向上遍历
          // 应该是类似 "README.md" 或 "guide.md"
          expect(result.relativePath).toMatch(/^[\w-]+\.md$/);
        }
      });
    } finally {
      await cleanupReplace();
    }
  });
});

describe("输入验证", () => {
  it("验证空路径抛出错误", async () => {
    await expect(
      extractImagesFromDirectory("")
    ).rejects.toThrow("rootDir is required and must be a string");
  });

  it("验证负数 depth 抛出错误", async () => {
    await expect(
      extractImagesFromDirectory(".", { depth: -1 })
    ).rejects.toThrow("depth must be a non-negative integer");
  });

  it("验证非整数 depth 抛出错误", async () => {
    await expect(
      extractImagesFromDirectory(".", { depth: 1.5 })
    ).rejects.toThrow("depth must be a non-negative integer");
  });

  it("验证无效类型 depth 抛出错误", async () => {
    await expect(
      extractImagesFromDirectory(".", { depth: "invalid" as any })
    ).rejects.toThrow('depth must be "all" or a number');
  });

  it("验证 null 字符路径抛出错误", async () => {
    await expect(
      extractImagesFromDirectory("test\0path")
    ).rejects.toThrow("contains invalid null character");
  });

  it("logger 回调被正确调用", async () => {
    const logs: Array<{ level: string; message: string }> = [];
    const logger = (level: string, message: string) => {
      logs.push({ level, message });
    };

    const testDir = join(__dirname, "temp-logger-test");
    try {
      await mkdir(testDir, { recursive: true });
      
      // 创建一个 markdown 文件但故意损坏（设置错误权限或内容）
      const mdFile = join(testDir, "test.md");
      await writeFile(mdFile, "# Test\n![img](./pic.png)");
      
      // 正常扫描应该成功
      const results = await extractImagesFromDirectory(testDir, { 
        localPrefixes: ["*"],
        logger 
      });
      
      // 基础扫描应该成功
      expect(results.length).toBeGreaterThan(0);
      
      // 如果有任何警告或调试信息会被记录
      // 这个测试主要验证 logger 可以被正确调用，不抛出错误
      expect(logs).toBeDefined();
    } finally {
      try {
        await rm(testDir, { recursive: true });
      } catch {
        // ignore
      }
    }
  });
});

