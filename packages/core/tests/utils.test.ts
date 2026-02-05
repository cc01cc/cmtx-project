/**
 * 工具函数测试
 *
 * 测试 normalizePath、isWebSource 和类型守卫函数：
 * - 路径规范化（跨平台兼容）
 * - Web/Local 来源判断
 * - ImageMatch 类型守卫
 */

import { describe, it, expect } from "vitest";
import type {
  ImageMatch,
  WebImageMatch,
  LocalImageMatchRelative,
  LocalImageMatchWithAbsPath,
} from "../src/types.js";
import {
  normalizePath,
  isWebSource,
  isWebImage,
  isLocalImage,
  isLocalImageWithAbsPath,
  isLocalImageRelative,
  hasAbsLocalPath,
} from "../src/utils.js";

describe("normalizePath", () => {
  describe("基本规范化", () => {
    it("应该将反斜杠转换为正斜杠", () => {
      const path = String.raw`C:\Users\project\file.txt`;
      const normalized = normalizePath(path);
      expect(normalized).not.toContain("\\");
      expect(normalized).toContain("/");
    });

    it("应该保留已经是正斜杠的路径", () => {
      const path = "/home/user/project/file.txt";
      const normalized = normalizePath(path);
      expect(normalized).toBe(path);
    });

    it("应该处理混合分隔符", () => {
      const path = String.raw`C:/Users\project/file.txt`;
      const normalized = normalizePath(path);
      if (process.platform === "win32") {
        expect(normalized).toBe("c:/users/project/file.txt");
      } else {
        expect(normalized).toBe("C:/Users/project/file.txt");
      }
    });
  });

  describe("Windows 路径处理", () => {
    it("应该在 Windows 上将路径转为小写", () => {
      const path = "C:/Users/Project/File.TXT";
      const normalized = normalizePath(path);

      if (process.platform === "win32") {
        expect(normalized).toBe("c:/users/project/file.txt");
      } else {
        expect(normalized).toBe("C:/Users/Project/File.TXT");
      }
    });

    it("应该处理 Windows 盘符", () => {
      const path = String.raw`D:\Projects\MyApp`;
      const normalized = normalizePath(path);
      if (process.platform === "win32") {
        expect(normalized).toContain("d:");
      } else {
        expect(normalized).toContain("D:");
      }
      expect(normalized).not.toContain("\\");
    });
  });

  describe("边界情况", () => {
    it("应该处理空字符串", () => {
      const result = normalizePath("");
      expect(result === "" || result === ".").toBe(true);
    });

    it("应该处理只有分隔符的路径", () => {
      expect(normalizePath("/")).toBe("/");
      expect(normalizePath("\\")).toBe("/");
    });

    it("应该处理相对路径", () => {
      const path = "./images/logo.png";
      const normalized = normalizePath(path);
      expect(normalized === "./images/logo.png" || normalized === "images/logo.png").toBe(true);
    });

    it("应该处理包含 .. 的路径", () => {
      const path = "../images/../assets/logo.png";
      const normalized = normalizePath(path);
      expect(normalized).not.toContain("../images/..");
    });

    it("应该处理包含 . 的路径", () => {
      const path = "./images/./logo.png";
      const normalized = normalizePath(path);
      expect(normalized).not.toContain("/./");
    });

    it("应该处理各种绝对路径格式", () => {
      // Unix绝对路径
      expect(normalizePath("/usr/local/bin")).toBe("/usr/local/bin");
      expect(normalizePath("/home/user/documents")).toBe("/home/user/documents");
      
      // Windows绝对路径
      if (process.platform === "win32") {
        expect(normalizePath(String.raw`\Program Files\App`)).toBe("/program files/app");
        expect(normalizePath(String.raw`C:\Users\username\documents`)).toBe("c:/users/username/documents");
        expect(normalizePath("D:/data/files")).toBe("d:/data/files");
      } else {
        expect(normalizePath(String.raw`\Program Files\App`)).toBe("/Program Files/App");
        expect(normalizePath(String.raw`C:\Users\username\documents`)).toBe("C:/Users/username/documents");
        expect(normalizePath("D:/data/files")).toBe("D:/data/files");
      }
    });

    it("应该处理国际化路径", () => {
      // 中文路径
      expect(normalizePath("./图片/照片.png")).toContain("图片");
      expect(normalizePath("/用户/文档/file.txt")).toContain("用户");
      
      // 日文路径
      expect(normalizePath("./画像/写真.jpg")).toContain("画像");
      expect(normalizePath("/ユーザー/ドキュメント/doc.pdf")).toContain("ユーザー");
      
      // 韩文路径
      expect(normalizePath("./이미지/사진.gif")).toContain("이미지");
      expect(normalizePath("/사용자/문서/document.doc")).toContain("사용자");
      
      // 混合多语言路径
      expect(normalizePath("./photos/图片/photo 图片@2x.png")).toContain("图片");
    });
  });

  describe("特殊字符", () => {
    it("应该保留空格", () => {
      const path = "/path with spaces/file.txt";
      expect(normalizePath(path)).toBe("/path with spaces/file.txt");
    });

    it("应该保留 Unicode 字符", () => {
      const path = "/用户/项目/文件.txt";
      expect(normalizePath(path)).toBe("/用户/项目/文件.txt");
    });

    it("应该保留 URL 编码字符", () => {
      const path = "/path%20encoded/file.txt";
      expect(normalizePath(path)).toBe("/path%20encoded/file.txt");
    });
  });
});

describe("isWebSource", () => {
  describe("Web URL 识别", () => {
    it("应该识别 http:// URL", () => {
      expect(isWebSource("http://example.com/image.png")).toBe(true);
    });

    it("应该识别 https:// URL", () => {
      expect(isWebSource("https://example.com/image.png")).toBe(true);
    });

    it("应该识别协议相对 URL", () => {
      expect(isWebSource("//cdn.example.com/image.png")).toBe(true);
    });

    it("应该识别带路径的 URL", () => {
      expect(isWebSource("https://cdn.example.com/path/to/image.png")).toBe(true);
    });

    it("应该识别带查询参数的 URL", () => {
      expect(isWebSource("https://example.com/image.png?v=123")).toBe(true);
    });
  });

  describe("本地路径识别", () => {
    it("应该识别相对路径", () => {
      expect(isWebSource("./image.png")).toBe(false);
      expect(isWebSource("../images/logo.png")).toBe(false);
      expect(isWebSource("images/photo.jpg")).toBe(false);
      expect(isWebSource("assets/images/banner.gif")).toBe(false);
    });

    it("应该识别绝对路径", () => {
      expect(isWebSource("/home/user/image.png")).toBe(false);
      expect(isWebSource("C:/Users/image.png")).toBe(false);
      expect(isWebSource(String.raw`\Network\Share\file.png`)).toBe(false);
      expect(isWebSource(String.raw`D:\Data\Files\document.pdf`)).toBe(false);
    });

    it("应该识别纯文件名", () => {
      expect(isWebSource("image.png")).toBe(false);
      expect(isWebSource("photo.jpg")).toBe(false);
    });

    it("应该识别带目录的相对路径", () => {
      expect(isWebSource("images/logo.png")).toBe(false);
      expect(isWebSource("assets/images/banner.jpg")).toBe(false);
      expect(isWebSource("../shared/icons/icon.svg")).toBe(false);
    });

    it("应该处理各种操作系统路径格式", () => {
      // Unix/Linux风格路径
      expect(isWebSource("/usr/local/bin/executable")).toBe(false);
      expect(isWebSource("~/Documents/file.txt")).toBe(false);
      
      // Windows风格路径
      expect(isWebSource(String.raw`C:\Windows\System32\cmd.exe`)).toBe(false);
      expect(isWebSource(String.raw`\\Server\Share\file.doc`)).toBe(false);
      
      // 混合格式
      expect(isWebSource("C:/Program Files/Application/app.exe")).toBe(false);
    });
  });

  describe("边界情况", () => {
    it("应该处理带空格的 URL", () => {
      expect(isWebSource("  https://example.com/image.png  ")).toBe(true);
    });

    it("应该处理空字符串", () => {
      expect(isWebSource("")).toBe(false);
    });

    it("应该处理只有空白字符的字符串", () => {
      expect(isWebSource("   ")).toBe(false);
    });

    it("应该处理看起来像 URL 但不是的字符串", () => {
      expect(isWebSource("http-not-a-url")).toBe(false);
      expect(isWebSource("httpsite.com")).toBe(false);
    });

    it("应该处理大写的协议", () => {
      expect(isWebSource("HTTP://example.com/image.png")).toBe(true);
      expect(isWebSource("HTTPS://example.com/image.png")).toBe(true);
    });
  });
});

describe("类型守卫函数", () => {
  const createWebImage = (): WebImageMatch => ({
    type: "web",
    alt: "Web Image",
    src: "https://example.com/image.png",
    raw: "![Web Image](https://example.com/image.png)",
    syntax: "md",
    source: "text",
  });

  const createLocalImageRelative = (): LocalImageMatchRelative => ({
    type: "local",
    alt: "Local Image",
    src: "./image.png",
    raw: "![Local Image](./image.png)",
    syntax: "md",
    source: "text",
  });

  const createLocalImageWithAbsPath = (): LocalImageMatchWithAbsPath => ({
    type: "local",
    alt: "Local Image",
    src: "./image.png",
    absLocalPath: "/home/user/project/image.png",
    raw: "![Local Image](./image.png)",
    syntax: "md",
    source: "file",
  });

  describe("isWebImage", () => {
    it("应该识别 WebImageMatch", () => {
      const image = createWebImage();
      expect(isWebImage(image)).toBe(true);
    });

    it("不应该识别 LocalImageMatch", () => {
      const image = createLocalImageRelative();
      expect(isWebImage(image)).toBe(false);
    });

    it("类型守卫应该正确收窄类型", () => {
      const image: ImageMatch = createWebImage();
      if (isWebImage(image)) {
        expect(image.src).toBe("https://example.com/image.png");
      }
    });
  });

  describe("isLocalImage", () => {
    it("应该识别 LocalImageMatchRelative", () => {
      const image = createLocalImageRelative();
      expect(isLocalImage(image)).toBe(true);
    });

    it("应该识别 LocalImageMatchWithAbsPath", () => {
      const image = createLocalImageWithAbsPath();
      expect(isLocalImage(image)).toBe(true);
    });

    it("不应该识别 WebImageMatch", () => {
      const image = createWebImage();
      expect(isLocalImage(image)).toBe(false);
    });
  });

  describe("isLocalImageWithAbsPath", () => {
    it("应该识别带绝对路径的本地图片", () => {
      const image = createLocalImageWithAbsPath();
      expect(isLocalImageWithAbsPath(image)).toBe(true);
    });

    it("不应该识别相对路径的本地图片", () => {
      const image = createLocalImageRelative();
      expect(isLocalImageWithAbsPath(image)).toBe(false);
    });

    it("不应该识别 Web 图片", () => {
      const image = createWebImage();
      expect(isLocalImageWithAbsPath(image)).toBe(false);
    });

    it("类型守卫应该正确收窄类型", () => {
      const image: ImageMatch = createLocalImageWithAbsPath();
      if (isLocalImageWithAbsPath(image)) {
        expect(image.absLocalPath).toBe("/home/user/project/image.png");
      }
    });
  });

  describe("isLocalImageRelative", () => {
    it("应该识别相对路径的本地图片", () => {
      const image = createLocalImageRelative();
      expect(isLocalImageRelative(image)).toBe(true);
    });

    it("不应该识别带绝对路径的本地图片", () => {
      const image = createLocalImageWithAbsPath();
      expect(isLocalImageRelative(image)).toBe(false);
    });

    it("不应该识别 Web 图片", () => {
      const image = createWebImage();
      expect(isLocalImageRelative(image)).toBe(false);
    });

    it("类型守卫应该正确收窄类型", () => {
      const image: ImageMatch = createLocalImageRelative();
      if (isLocalImageRelative(image)) {
        expect("absLocalPath" in image).toBe(false);
      }
    });
  });

  describe("hasAbsLocalPath", () => {
    it("应该识别带绝对路径的本地图片", () => {
      const image = createLocalImageWithAbsPath();
      expect(hasAbsLocalPath(image)).toBe(true);
    });

    it("不应该识别相对路径的本地图片", () => {
      const image = createLocalImageRelative();
      expect(hasAbsLocalPath(image)).toBe(false);
    });

    it("不应该识别 Web 图片", () => {
      const image = createWebImage();
      expect(hasAbsLocalPath(image)).toBe(false);
    });

    it("应该是 isLocalImageWithAbsPath 的别名", () => {
      const withAbsPath = createLocalImageWithAbsPath();
      const relative = createLocalImageRelative();

      expect(hasAbsLocalPath(withAbsPath)).toBe(isLocalImageWithAbsPath(withAbsPath));
      expect(hasAbsLocalPath(relative)).toBe(isLocalImageWithAbsPath(relative));
    });
  });

  describe("类型守卫组合使用", () => {
    it("应该能够区分所有图片类型", () => {
      const images: ImageMatch[] = [
        createWebImage(),
        createLocalImageRelative(),
        createLocalImageWithAbsPath(),
      ];

      const webImages = images.filter(isWebImage);
      const localImages = images.filter(isLocalImage);
      const localWithAbsPath = images.filter(isLocalImageWithAbsPath);
      const localRelative = images.filter(isLocalImageRelative);

      expect(webImages).toHaveLength(1);
      expect(localImages).toHaveLength(2);
      expect(localWithAbsPath).toHaveLength(1);
      expect(localRelative).toHaveLength(1);
    });

    it("应该正确处理类型收窄", () => {
      const processImage = (image: ImageMatch): string => {
        if (isWebImage(image)) {
          return `Web: ${image.src}`;
        }
        if (isLocalImageWithAbsPath(image)) {
          return `Local (abs): ${image.absLocalPath}`;
        }
        if (isLocalImageRelative(image)) {
          return `Local (rel): ${image.src}`;
        }
        return "Unknown";
      };

      expect(processImage(createWebImage())).toContain("Web:");
      expect(processImage(createLocalImageWithAbsPath())).toContain("Local (abs):");
      expect(processImage(createLocalImageRelative())).toContain("Local (rel):");
    });
  });
});
