/**
 * Core Layer Type Definitions
 */

/**
 * 图片来源类型
 */
export type ImageSourceType = "web" | "local";

/**
 * 内部使用的解析后的图片数据
 */
export interface ParsedImage {
  alt: string;
  src: string;
  title?: string;
  raw: string;
  index: number;
}

/**
 * 匹配到的图片信息
 */
export interface ImageMatch {
  alt: string;
  src: string;
  title?: string;
  raw: string;
  index: number;
  sourceType: ImageSourceType;
}

/**
 * 图片提取选项（内核层）
 */
export interface ExtractOptionsInternal {
  webHosts?: string[];
  localPrefixes?: string[];
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
  /** 文件相对路径（相对于搜索根目录） */
  relativePath: string;
  
  /** 文件绝对路径 */
  absolutePath: string;
  
  /** 该文件中所有引用该图片的位置 */
  locations: ImageReferenceLocation[];
}

/**
 * 单次替换详情（Core 层）
 */
export interface CoreReplacementDetail {
  /** 行号（从 1 开始） */
  line: number;
  
  /** 列号（从 0 开始） */
  column: number;
  
  /** 替换前的原始 Markdown 语法 */
  oldText: string;
  
  /** 替换后的新 Markdown 语法 */
  newText: string;
  
  /** 替换类型 */
  type: "src" | "alt" | "both";
}

/**
 * 单个文件的替换结果（Core 层）
 */
export interface CoreReplaceResult {
  /** 文件相对路径 */
  relativePath: string;
  
  /** 文件绝对路径 */
  absolutePath: string;
  
  /** 替换详情列表 */
  replacements: CoreReplacementDetail[];
  
  /** 新的 Markdown 内容 */
  newMarkdown: string;
}
