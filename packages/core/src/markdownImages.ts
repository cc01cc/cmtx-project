/**
 * API 层：边界处理，路径规范化，调用内核层
 */

import { resolve, isAbsolute } from "node:path";

import * as core from "./core/index.js";

/**
 * 图片来源类型
 * - `web`: 网页图片（HTTP/HTTPS URL）
 * - `local`: 本地路径
 */
export type ImageSourceType = core.ImageSourceType;

/**
 * 匹配到的图片信息
 */
export interface ImageMatch {
  /** 图片的 alt 文本 */
  alt: string;

  /** 图片源（URL 或本地路径） */
  src: string;

  /** 图片的 title（如果存在） */
  title?: string;

  /** 原始 Markdown 片段 */
  raw: string;

  /** 图片在 Markdown 文本中的起始位置 */
  index: number;

  /** 图片来源类型：'web'（网址）或 'local'（本地路径） */
  sourceType: ImageSourceType;
}

/**
 * 图片提取选项配置
 */
export interface ExtractOptions {
  /**
   * 网页图片匹配的主机名列表（严格等值匹配）
   *
   * @remarks
   * 规则：
   * - 传入主机名数组，如 `["cc01cc.cn", "example.com"]`，则仅匹配这些域名
   * - 传入 `["*"]`，则匹配所有网页图片（http、https、protocol-relative）
   * - 为空、undefined 或不传，则不匹配任何网页图片
   *
   * 说明：
   * - 主机名比较为严格等值，不支持子域名匹配（例如 "sub.cc01cc.cn" 不匹配 "cc01cc.cn"）
   * - Protocol-relative URL（如 `//cdn.example.com/img.png`）会被识别为网页图片
   *
   * @example
   * ```typescript
   * // 匹配特定域名
   * { webHosts: ["cc01cc.cn", "example.com"] }
   *
   * // 匹配所有网页图片
   * { webHosts: ["*"] }
   * ```
   */
  webHosts?: string[];

  /**
   * 本地图片路径前缀列表（前缀匹配）
   *
   * @remarks
   * 规则：
   * - 传入前缀数组，如 `["./", "/root/images/"]`，则匹配以这些前缀开头的本地路径
   * - 传入 `["*"]`，则匹配所有本地图片
   * - 为空、undefined 或不传，则不匹配任何本地图片
   *
   * 说明：
   * - 前缀匹配是字符串前缀比对
   * - 不会自动补充 "/" 或处理路径规范化
   * - 可用于匹配相对路径（"./"）、绝对路径（"/"）、或不带前缀的相对路径（"img/"）
   *
   * @example
   * ```typescript
   * // 匹配相对路径和特定目录
   * { localPrefixes: ["./", "/root/"] }
   *
   * // 匹配所有本地图片
   * { localPrefixes: ["*"] }
   * ```
   */
  localPrefixes?: string[];

  /**
   * 项目根目录路径（用于解析相对路径）
   * 
   * @remarks
   * - 如果不提供，相对路径将相对于 `process.cwd()` 解析
   * - 传入的路径必须存在，否则会抛出错误
   * - 支持绝对路径和相对路径（相对路径相对于 `process.cwd()`）
   * 
   * @example
   * ```typescript
   * // 使用项目根目录
   * { projectRoot: "/path/to/project" }
   * 
   * // 使用相对路径
   * { projectRoot: "./my-project" }
   * ```
   */
  projectRoot?: string;
}

/**
 * 目录扫描选项
 */
export interface ScanDirectoryOptions extends ExtractOptions {
  /**
   * 扫描深度
   * - `"all"`: 递归扫描所有子目录（默认）
   * - 数字：指定扫描深度，0 表示仅扫描根目录
   */
  depth?: "all" | number;
}

/**
 * 目录扫描结果
 */
export interface DirectoryScanResult {
  /** 搜索根目录的绝对路径 */
  rootPath: string;

  /** 文件相对路径（相对于 rootPath） */
  relativePath: string;
  
  /** 文件的绝对路径 */
  absolutePath: string;
  
  /** 从该文件中提取的图片列表 */
  images: ImageMatch[];
}

/**
 * 图片引用位置信息
 *
 * @remarks
 * 行号和列号遵循编辑器标准（LSP/VS Code 标准）：
 * - **行号（line）**：从 1 开始，对应编辑器中显示的行号
 * - **列号（column）**：从 0 开始，对应字符在行中的索引
 *
 * 这样设计的原因：
 * 1. 符合 LSP（Language Server Protocol）标准
 * 2. 符合 VS Code、Vim 等编辑器的习惯
 * 3. 用户在编辑器中看到的行号就是返回的 line 值
 * 4. 能与编辑器 API 直接对接，无需做 +1/-1 的转换
 *
 * @example
 * ```
 * Markdown 文本：
 * 1: # 标题
 * 2: ![Logo](./img.png)
 * 3:    ^
 *       |
 *    column: 0, line: 2
 * ```
 *
 * @see {@link getImageReferenceDetails}
 */
export interface ImageReferenceLocation {
  /**
   * 行号（从 1 开始）
   *
   * 对应编辑器中显示的行号。例如用户在编辑器中看到第 5 行，则 line === 5
   */
  line: number;
  
  /**
   * 列号（从 0 开始）
   *
   * 字符在该行中的索引。例如 `![Logo]` 中 `!` 的列号是 0，`[` 的列号是 1
   *
   * 在编辑器中显示的列号通常 = column + 1（大多数编辑器列号从 1 开始显示）
   */
  column: number;
  
  /** 包含引用的完整行文本 */
  lineText: string;
}

/**
 * 单个文件的图片引用详情
 */
export interface ImageReferenceDetail {
  /** 搜索根目录的绝对路径 */
  rootPath: string;

  /** 文件相对路径（相对于 rootPath） */
  relativePath: string;
  
  /** 文件绝对路径 */
  absolutePath: string;
  
  /** 该文件中所有引用该图片的位置 */
  locations: ImageReferenceLocation[];
}

/**
 * 单次替换详情
 *
 * @remarks
 * 行号和列号遵循编辑器标准：
 * - **行号（line）**：从 1 开始，对应编辑器显示的行号
 * - **列号（column）**：从 0 开始，对应字符在行中的索引
 *
 * @example
 * ```
 * 原 Markdown：
 * 1: # 标题
 * 2: ![Logo](./old.png)
 * 
 * 替换后：
 * 2: ![Logo](./new.png)
 * 
 * 替换详情：
 * {
 *   line: 2,
 *   column: 0,
 *   oldText: "![Logo](./old.png)",
 *   newText: "![Logo](./new.png)",
 *   type: "src"
 * }
 * ```
 *
 * @see {@link replaceImageInFiles}
 */
export interface ReplacementDetail {
  /**
   * 行号（从 1 开始）
   *
   * 对应编辑器中显示的行号。该替换发生在第几行
   */
  line: number;

  /**
   * 列号（从 0 开始）
   *
   * 替换内容在该行中的起始字符索引。在编辑器中显示的列号通常 = column + 1
   */
  column: number;

  /** 替换前的完整 Markdown 文本（包括 `![alt](src)` 等） */
  oldText: string;

  /** 替换后的完整 Markdown 文本 */
  newText: string;

  /**
   * 替换类型
   * - `src`：仅替换图片源
   * - `alt`：仅替换 alt 文本
   * - `both`：同时替换源和 alt 文本
   */
  type: "src" | "alt" | "both";
}

/**
 * 单个文件的替换结果
 */
export interface ReplaceFileResult {
  /** 文件相对路径 */
  relativePath: string;

  /** 文件绝对路径 */
  absolutePath: string;

  /** 替换详情列表 */
  replacements: ReplacementDetail[];

  /** 是否成功 */
  success: boolean;

  /** 错误信息（如果失败） */
  error?: string;
}

/**
 * 图片替换选项
 */
export interface ReplaceImageOptions {
  /** 新的图片路径（替换 src） */
  newSrc?: string;

  /** 新的 alt 文本（替换 alt） */
  newAlt?: string;

  /** 扫描深度（可选） */
  depth?: "all" | number;

  /** 项目根目录（可选） */
  projectRoot?: string;
}

/**
 * 将用户提供的路径规范化为绝对路径
 * @param userPath - 用户提供的路径（可以是相对路径或绝对路径）
 * @param projectRoot - 项目根目录（可选）
 * @returns 绝对路径
 */
function resolveUserPath(userPath: string, projectRoot?: string): string {
  // 如果已是绝对路径，直接返回
  if (isAbsolute(userPath)) {
    return userPath;
  }
  
  // 相对路径：相对于 projectRoot（如果提供）或 cwd
  const baseDir = projectRoot ? resolveUserPath(projectRoot) : process.cwd();
  
  // 验证 baseDir 存在（同步检查，在启动时失败优于运行时失败）
  try {
    // 使用同步方法验证路径存在
    const fs = require('node:fs');
    if (!fs.existsSync(baseDir)) {
      throw new Error(`Base directory not found: ${baseDir}`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Base directory not found')) {
      throw error;
    }
    throw new Error(`Cannot access base directory: ${baseDir}: ${error}`);
  }
  
  return resolve(baseDir, userPath);
}

/**
 * 从 Markdown 文本中提取符合条件的图片
 *
 * 根据配置的域名列表和路径前缀，从 Markdown 文本中提取符合条件的图片引用。
 * 支持按网页域名（严格等值匹配）和本地路径前缀（前缀匹配）进行过滤。
 *
 * @param markdown - Markdown 文本内容
 * @param options - 提取选项配置
 * @returns 符合条件的图片列表
 *
 * @example
 * 提取特定域名的图片
 * ```typescript
 * const markdown = `
 * ![logo](https://cc01cc.cn/logo.png)
 * ![demo](./images/demo.png)
 * `;
 *
 * const result = extractImages(markdown, {
 *   webHosts: ["cc01cc.cn"],
 *   localPrefixes: ["./"]
 * });
 * // result.length === 2
 * ```
 *
 * @example
 * 使用通配符匹配所有图片
 * ```typescript
 * const allWebImages = extractImages(markdown, { webHosts: ["*"] });
 * const allLocalImages = extractImages(markdown, { localPrefixes: ["*"] });
 * ```
 */
export function extractImages(
  markdown: string,
  options: ExtractOptions = {},
): ImageMatch[] {
  const { webHosts, localPrefixes } = options;
  return core.extractImagesInternal(markdown, { webHosts, localPrefixes });
}

/**
 * 从 Markdown 文件中提取符合条件的图片
 *
 * 读取指定的 Markdown 文件内容，并根据配置提取图片引用。
 * 支持相对路径和绝对路径，相对路径相对于 `projectRoot`（如果提供）或 `process.cwd()` 解析。
 *
 * @param filePath - Markdown 文件路径（支持相对路径和绝对路径）
 * @param options - 提取选项配置
 * @returns 符合条件的图片列表
 *
 * @throws 当文件不存在或无法读取时抛出错误
 *
 * @example
 * 使用绝对路径
 * ```typescript
 * const images = await extractImagesFromFile("/path/to/README.md", {
 *   webHosts: ["cc01cc.cn"]
 * });
 * ```
 *
 * @example
 * 使用相对路径（相对于 projectRoot）
 * ```typescript
 * const images = await extractImagesFromFile("docs/README.md", {
 *   webHosts: ["*"],
 *   projectRoot: "/path/to/project"
 * });
 * ```
 */
export async function extractImagesFromFile(
  filePath: string,
  options: ExtractOptions = {},
): Promise<ImageMatch[]> {
  const absPath = resolveUserPath(filePath, options.projectRoot);
  return core.extractImagesFromFileInternal(absPath, {
    webHosts: options.webHosts,
    localPrefixes: options.localPrefixes,
  });
}

/**
 * 从目录中递归扫描所有 Markdown 文件并提取图片
 *
 * 递归扫描指定目录下的所有 Markdown 文件（.md、.markdown），并提取符合条件的图片引用。
 * 支持控制扫描深度，以便在大型项目中提高性能。
 *
 * @param rootDir - 要扫描的根目录路径（支持相对路径和绝对路径）
 * @param options - 扫描选项配置
 * @returns 扫描结果数组，每个元素包含文件路径和该文件中的图片列表
 *
 * @throws 当目录不存在或无法访问时抛出错误
 *
 * @example
 * 扫描所有子目录
 * ```typescript
 * const results = await extractImagesFromDirectory("./docs", {
 *   webHosts: ["cc01cc.cn"],
 *   localPrefixes: ["./"],
 *   depth: "all",  // 默认值
 *   projectRoot: "/path/to/project"
 * });
 *
 * console.log(`Found ${results.length} markdown files`);
 * results.forEach(r => {
 *   console.log(`${r.relativePath}: ${r.images.length} images`);
 * });
 * ```
 *
 * @example
 * 限制扫描深度
 * ```typescript
 * // 仅扫描根目录
 * const rootOnly = await extractImagesFromDirectory("./docs", {
 *   webHosts: ["*"],
 *   depth: 0
 * });
 *
 * // 扫描根目录和一级子目录
 * const oneLevel = await extractImagesFromDirectory("./docs", {
 *   webHosts: ["*"],
 *   depth: 1
 * });
 * ```
 */
export async function extractImagesFromDirectory(
  rootDir: string,
  options: ScanDirectoryOptions = {},
): Promise<DirectoryScanResult[]> {
  const rootAbsPath = resolveUserPath(rootDir, options.projectRoot);
  const { depth, webHosts, localPrefixes } = options;
  
  const coreResults = await core.extractImagesFromDirectoryInternal(
    rootAbsPath,
    { depth, webHosts, localPrefixes }
  );
  
  return coreResults.map((r: { relativePath: string; absolutePath: string; images: core.ImageMatch[] }) => ({
    rootPath: rootAbsPath,
    relativePath: r.relativePath,
    absolutePath: r.absolutePath,
    images: r.images,
  }));
}

/**
 * 检查指定的 Markdown 文件是否引用了某个本地图片文件
 *
 * 此函数通过解析 Markdown 文件中的所有图片引用，并将相对路径解析为绝对路径，
 * 然后与提供的图片文件绝对路径进行比较。支持跨平台路径处理（Windows 下不区分大小写）。
 *
 * @param imagePath - 本地图片文件的路径（支持相对路径和绝对路径）
 * @param markdownFilePath - Markdown 文件的路径（支持相对路径和绝对路径）
 * @param options - 选项配置（仅使用 projectRoot）
 * @returns 如果 Markdown 文件引用了该图片则返回 `true`，否则返回 `false`
 *
 * @throws 当 Markdown 文件不存在或无法读取时抛出错误
 *
 * @example
 * 检查单个文件
 * ```typescript
 * const isReferenced = await isImageReferencedInFile(
 *   "images/logo.png",
 *   "docs/README.md",
 *   { projectRoot: "/path/to/project" }
 * );
 *
 * if (isReferenced) {
 *   console.log("该文件引用了这个图片");
 * }
 * ```
 */
export async function isImageReferencedInFile(
  imagePath: string,
  markdownFilePath: string,
  options: Pick<ExtractOptions, "projectRoot"> = {},
): Promise<boolean> {
  const imageAbsPath = resolveUserPath(imagePath, options.projectRoot);
  const markdownAbsPath = resolveUserPath(markdownFilePath, options.projectRoot);
  
  return core.isImageReferencedInFileInternal(imageAbsPath, markdownAbsPath);
}

/**
 * 在指定目录中查找所有引用了某个本地图片文件的 Markdown 文件
 *
 * 此函数递归扫描目录中的所有 Markdown 文件，并检查哪些文件引用了指定的图片。
 * 支持通过 `depth` 选项控制扫描深度，以便在大型项目中提高性能。
 *
 * @param imagePath - 本地图片文件的路径（支持相对路径和绝对路径）
 * @param searchDir - 要搜索的根目录路径（支持相对路径和绝对路径）
 * @param options - 扫描选项（depth 和 projectRoot）
 * @returns 包含引用了该图片的所有 Markdown 文件的结果数组
 *
 * @throws 当搜索目录不存在或无法访问时抛出错误
 *
 * @example
 * 查找所有引用特定图片的文件
 * ```typescript
 * const results = await findFilesReferencingImage(
 *   "images/logo.png",
 *   "docs",
 *   {
 *     depth: "all",
 *     projectRoot: "/path/to/project"
 *   }
 * );
 *
 * console.log(`Found ${results.length} files referencing the image`);
 * results.forEach(r => {
 *   console.log(`- ${r.relativePath}`);
 * });
 * ```
 */
export async function findFilesReferencingImage(
  imagePath: string,
  searchDir: string,
  options: Pick<ScanDirectoryOptions, "depth" | "projectRoot"> = {},
): Promise<DirectoryScanResult[]> {
  const imageAbsPath = resolveUserPath(imagePath, options.projectRoot);
  const searchDirAbsPath = resolveUserPath(searchDir, options.projectRoot);
  const { depth = "all" } = options;
  
  const coreResults = await core.findFilesReferencingImageInternal(
    imageAbsPath,
    searchDirAbsPath,
    depth
  );
  
  return coreResults.map((r: { relativePath: string; absolutePath: string }) => ({
    rootPath: searchDirAbsPath,
    relativePath: r.relativePath,
    absolutePath: r.absolutePath,
    images: [],  // 此场景下不需要详细图片信息
  }));
}

/**
 * 获取图片引用的详细信息（包括引用位置）
 *
 * 此函数在目录中查找所有引用了指定图片的 Markdown 文件，并返回每个引用的详细位置信息，
 * 包括行号、列号和完整的行文本。这对于生成报告、重构或分析图片使用情况非常有用。
 *
 * @param imagePath - 本地图片文件的路径（支持相对路径和绝对路径）
 * @param searchDir - 要搜索的根目录路径（支持相对路径和绝对路径）
 * @param options - 扫描选项（depth 和 projectRoot）
 * @returns 图片引用详情数组，包含每个文件的所有引用位置
 *
 * @throws 当搜索目录不存在或无法访问时抛出错误
 *
 * @remarks
 * - 行号从 1 开始（符合编辑器标准）
 * - 列号从 0 开始（字符索引）
 * - 支持 CRLF（Windows）和 LF（Unix）换行符
 * - 跳过代码块中的图片引用（实际上不会跳过，正则会匹配，这是已知限制）
 *
 * @example
 * 获取图片引用详情
 * ```typescript
 * const details = await getImageReferenceDetails(
 *   "images/logo.png",
 *   "docs",
 *   {
 *     depth: "all",
 *     projectRoot: "/path/to/project"
 *   }
 * );
 *
 * details.forEach(detail => {
 *   console.log(`File: ${detail.relativePath}`);
 *   detail.locations.forEach(loc => {
 *     console.log(`  Line ${loc.line}, Column ${loc.column}: ${loc.lineText}`);
 *   });
 * });
 * ```
 *
 * @example
 * 生成删除前的影响报告
 * ```typescript
 * const details = await getImageReferenceDetails(
 *   "old-image.png",
 *   ".",
 *   { projectRoot: "/path/to/project" }
 * );
 *
 * if (details.length > 0) {
 *   console.log("WARNING: The following files reference this image:");
 *   details.forEach(d => {
 *     console.log(`  ${d.relativePath} (${d.locations.length} references)`);
 *   });
 * } else {
 *   console.log("Safe to delete: No references found");
 * }
 * ```
 */
export async function getImageReferenceDetails(
  imagePath: string,
  searchDir: string,
  options: Pick<ScanDirectoryOptions, "depth" | "projectRoot"> = {},
): Promise<ImageReferenceDetail[]> {
  const imageAbsPath = resolveUserPath(imagePath, options.projectRoot);
  const searchDirAbsPath = resolveUserPath(searchDir, options.projectRoot);
  const { depth = "all" } = options;
  
  const coreResults = await core.getImageReferenceDetailsInternal(
    imageAbsPath,
    searchDirAbsPath,
    depth
  );
  
  return coreResults.map((r: core.ImageReferenceDetail) => ({
    rootPath: searchDirAbsPath,
    relativePath: r.relativePath,
    absolutePath: r.absolutePath,
    locations: r.locations,
  }));
}

/**
 * 删除图片选项
 */
export interface DeleteImageOptions {
  /** 项目根目录（用于解析相对路径） */
  projectRoot?: string;
}

/**
 * 安全删除选项
 */
export interface SafeDeleteOptions extends DeleteImageOptions {
  /** 搜索深度（默认 "all"） */
  depth?: "all" | number;
}

/**
 * 安全删除结果
 */
export type SafeDeleteResult =
  | {
      /** 是否已删除 */
      deleted: false;
      /** 未删除原因 */
      reason: "referenced";
      /** 第一个引用该图片的文件详情 */
      firstReference: ImageReferenceDetail;
    }
  | {
      /** 是否已删除 */
      deleted: true;
      /** 已删除文件的绝对路径 */
      path: string;
    };

/**
 * 删除本地图片文件
 * 
 * 此函数用于删除指定的本地图片文件。通过提供根目录作为安全围栏，
 * 防止删除根目录外的文件，避免路径穿越攻击。
 * 
 * @param rootDir - 根目录（安全围栏），图片必须在此目录内
 * @param imagePath - 图片路径（支持相对路径和绝对路径）
 * @param options - 删除选项
 * 
 * @throws 如果图片路径在根目录外（安全检查失败）
 * @throws 如果文件删除失败（如文件不存在、权限不足等）
 * 
 * @remarks
 * - 相对路径将基于 `projectRoot`（如提供）或 `process.cwd()` 解析
 * - 根目录和图片路径都会被规范化为绝对路径后进行安全检查
 * - 此函数不检查图片是否被 Markdown 文件引用，直接删除
 * 
 * @example
 * 删除指定图片
 * ```typescript
 * // 使用绝对路径
 * await deleteLocalImage(
 *   "/project/images",
 *   "/project/images/old-logo.png"
 * );
 * 
 * // 使用相对路径 + projectRoot
 * await deleteLocalImage(
 *   "images",
 *   "images/old-logo.png",
 *   { projectRoot: "/project" }
 * );
 * ```
 * 
 * @example
 * 错误处理
 * ```typescript
 * try {
 *   await deleteLocalImage("images", "logo.png");
 *   console.log("Image deleted successfully");
 * } catch (error) {
 *   if (error.message.includes("Security violation")) {
 *     console.error("Image is outside root directory");
 *   } else if (error.message.includes("Failed to delete")) {
 *     console.error("Failed to delete image:", error.message);
 *   }
 * }
 * ```
 */
export async function deleteLocalImage(
  rootDir: string,
  imagePath: string,
  options: DeleteImageOptions = {}
): Promise<void> {
  const rootAbsPath = resolveUserPath(rootDir, options.projectRoot);
  const imageAbsPath = resolveUserPath(imagePath, options.projectRoot);
  
  // 验证安全围栏
  core.validatePathWithinRoot(imageAbsPath, rootAbsPath);
  
  // 执行删除
  await core.deleteFileInternal(imageAbsPath);
}

/**
 * 安全删除本地图片（检查引用后删除）
 * 
 * 此函数在删除图片前先检查是否有 Markdown 文件引用该图片。
 * 如果有引用，则返回第一个引用的详细信息；如果无引用，则删除图片。
 * 
 * @param rootDir - 根目录（安全围栏 + 搜索范围）
 * @param imagePath - 图片路径（支持相对路径和绝对路径）
 * @param options - 删除选项（包含搜索深度）
 * @returns 删除结果（成功删除 or 发现引用）
 * 
 * @throws 如果图片路径在根目录外（安全检查失败）
 * @throws 如果搜索目录无法访问
 * 
 * @remarks
 * - 根目录同时作为安全围栏和搜索范围
 * - `depth` 参数控制搜索深度（默认 "all" 递归搜索所有子目录）
 * - 如果找到引用，返回第一个引用的详细信息（包括文件路径和引用位置）
 * - 如果无引用，执行删除并返回删除成功的结果
 * 
 * @example
 * 基本用法
 * ```typescript
 * const result = await safeDeleteLocalImage(
 *   "/project",
 *   "images/old-logo.png",
 *   { depth: "all" }
 * );
 * 
 * if (result.deleted) {
 *   console.log(`Deleted: ${result.path}`);
 * } else {
 *   console.log(`Cannot delete: Referenced in ${result.firstReference.relativePath}`);
 *   console.log(`First reference at line ${result.firstReference.locations[0].line}`);
 * }
 * ```
 * 
 * @example
 * 使用相对路径
 * ```typescript
 * const result = await safeDeleteLocalImage(
 *   ".",
 *   "images/temp.png",
 *   { 
 *     depth: "all",
 *     projectRoot: "/path/to/project"
 *   }
 * );
 * 
 * if (!result.deleted) {
 *   console.log("Image is still in use:");
 *   result.firstReference.locations.forEach(loc => {
 *     console.log(`  Line ${loc.line}: ${loc.lineText.trim()}`);
 *   });
 * }
 * ```
 * 
 * @example
 * 限制搜索深度
 * ```typescript
 * // 仅搜索根目录（不递归）
 * const result = await safeDeleteLocalImage(
 *   "/project/docs",
 *   "/project/images/icon.png",
 *   { depth: 0 }
 * );
 * ```
 */
export async function safeDeleteLocalImage(
  rootDir: string,
  imagePath: string,
  options: SafeDeleteOptions = {}
): Promise<SafeDeleteResult> {
  const rootAbsPath = resolveUserPath(rootDir, options.projectRoot);
  const imageAbsPath = resolveUserPath(imagePath, options.projectRoot);
  const { depth = "all" } = options;
  
  // 验证安全围栏
  core.validatePathWithinRoot(imageAbsPath, rootAbsPath);
  
  // 执行安全删除
  const result = await core.safeDeleteFileInternal(
    imageAbsPath,
    rootAbsPath,
    depth
  );
  
  if (result.deleted) {
    return {
      deleted: true,
      path: imageAbsPath
    };
  } else {
    return {
      deleted: false,
      reason: "referenced",
      firstReference: {
        rootPath: rootAbsPath,
        relativePath: result.firstReference!.relativePath,
        absolutePath: result.firstReference!.absolutePath,
        locations: result.firstReference!.locations
      }
    };
  }
}

/**
 * 在指定目录中替换所有引用某图片的 Markdown 文件
 *
 * 查找目录中所有引用了指定图片的 Markdown 文件，并替换其中的图片引用。
 * 支持替换图片源（src）和/或 alt 文本。
 *
 * @param oldImagePath - 原图片路径（本地路径）
 * @param searchDir - 搜索目录
 * @param options - 替换选项
 * @returns 每个文件的替换结果数组
 *
 * @example
 * 替换图片源
 * ```typescript
 * const results = await replaceImageInFiles(
 *   "images/old.png",
 *   "docs",
 *   {
 *     newSrc: "images/new.png",
 *     projectRoot: process.cwd()
 *   }
 * );
 * ```
 *
 * @example
 * 替换 alt 文本
 * ```typescript
 * const results = await replaceImageInFiles(
 *   "images/logo.png",
 *   "docs",
 *   {
 *     newAlt: "新的描述文本",
 *     projectRoot: process.cwd()
 *   }
 * );
 * ```
 *
 * @example
 * 同时替换 src 和 alt
 * ```typescript
 * const results = await replaceImageInFiles(
 *   "images/old.png",
 *   "docs",
 *   {
 *     newSrc: "https://example.com/new.png",
 *     newAlt: "新描述",
 *     projectRoot: process.cwd()
 *   }
 * );
 * ```
 */
export async function replaceImageInFiles(
  oldImagePath: string,
  searchDir: string,
  options: ReplaceImageOptions = {}
): Promise<ReplaceFileResult[]> {
  const oldImageAbsPath = resolveUserPath(oldImagePath, options.projectRoot);
  const searchDirAbsPath = resolveUserPath(searchDir, options.projectRoot);
  const { depth = "all", newSrc, newAlt } = options;

  // 验证至少有一个替换项
  if (!newSrc && !newAlt) {
    return [];
  }

  // 调用 Core 层执行替换
  const coreResults = await core.replaceImageInDirectoryInternal(
    oldImageAbsPath,
    searchDirAbsPath,
    depth,
    { newSrc, newAlt }
  );

  // 转换为 API 层的结果格式
  return coreResults.map((result: core.CoreReplaceResult) => ({
    relativePath: result.relativePath,
    absolutePath: result.absolutePath,
    replacements: result.replacements,
    success: result.replacements.length > 0,
    error: result.replacements.length === 0 ? "No replacements made" : undefined,
  }));
}
