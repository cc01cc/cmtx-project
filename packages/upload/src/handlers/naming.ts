/**
 * 文件命名和模板处理
 *
 * 支持三种命名方式：
 * - 预定义别名（original+timestamp+hash, hash-only 等）
 * - 模板字符串（{original}_{md5_8}_{datetime}{ext}）
 * - 自定义函数
 */

import { createHash, randomBytes } from "node:crypto";
import { stat, readFile } from "node:fs/promises";
import { extname, basename } from "node:path";
import type { NamingOptions } from "../types.js";

/**
 * 预定义策略别名（向后兼容）
 * 内部会转换为模板字符串
 */
const TEMPLATE_PRESETS = {
  "original+timestamp+hash": "{original}_{datetime}_{md5_8}{ext}",
  "hash-only": "{md5_8}{ext}",
  "timestamp-only": "{timestamp}{ext}",
  "uuid": "{uuid}{ext}",
} as const;

/**
 * 生成带时间戳和内容哈希的文件名
 */
export async function generateRenamedFilename(localPath: string): Promise<string> {
  const ext = extname(localPath);
  const nameWithoutExt = basename(localPath, ext);
  const timestamp = formatTimestamp();
  const hash = await computeFileHash(localPath);

  return `${nameWithoutExt}-${timestamp}-${hash}${ext}`;
}

/**
 * 计算文件内容的 MD5 哈希值（前 8 位）
 */
export async function computeFileHash(filePath: string): Promise<string> {
  const content = await readFile(filePath);
  return createHash("md5").update(content).digest("hex").slice(0, 8);
}

/**
 * 格式化时间戳为 YYYYMMDD-HHmmss-SSS
 */
export function formatTimestamp(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const milliseconds = String(date.getMilliseconds()).padStart(3, "0");

  return `${year}${month}${day}-${hours}${minutes}${seconds}-${milliseconds}`;
}

/**
 * 构建命名模板上下文
 */
async function buildTokenContext(
  localPath: string,
  computeSha256: boolean,
): Promise<Record<string, string | number>> {
  const ext = extname(localPath);
  const fullname = basename(localPath);
  const original = fullname.slice(0, -ext.length);

  const [fileStats, fileContent] = await Promise.all([
    stat(localPath),
    readFile(localPath),
  ]);

  const md5Full = createHash("md5").update(fileContent).digest("hex");
  let sha256Full = "";

  if (computeSha256) {
    sha256Full = createHash("sha256").update(fileContent).digest("hex");
  }

  const generateUUID = (): string => {
    const bytes = randomBytes(16);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    return bytes.toString("hex").replace(
      /^(.{8})(.{4})(.{4})(.{4})(.{12})$/,
      "$1-$2-$3-$4-$5",
    );
  };

  const randomStr = randomBytes(4).toString("hex");
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  return {
    original,
    ext,
    fullname,
    md5_8: md5Full.slice(0, 8),
    md5_16: md5Full.slice(0, 16),
    md5_32: md5Full,
    md5: md5Full,
    sha256_8: sha256Full.slice(0, 8),
    sha256_16: sha256Full.slice(0, 16),
    sha256_32: sha256Full.slice(0, 32),
    sha256_64: sha256Full,
    sha256: sha256Full,
    timestamp: Date.now(),
    timestamp_sec: Math.floor(Date.now() / 1000),
    date: `${year}${month}${day}`,
    time: `${hours}${minutes}${seconds}`,
    datetime: `${year}${month}${day}${hours}${minutes}${seconds}`,
    iso_date: `${year}-${month}-${day}`,
    size: fileStats.size,
    size_kb: Math.ceil(fileStats.size / 1024),
    size_mb: Math.ceil(fileStats.size / (1024 * 1024)),
    uuid: generateUUID(),
    random: randomStr,
  };
}

/**
 * 替换模板中的令牌
 */
function replaceTemplateTokens(
  template: string,
  context: Record<string, string | number>,
): string {
  const unknownTokens: string[] = [];
  const tokenRegex = /\{(\w+)\}/g;

  // 检查令牌有效性
  let tokenMatch = tokenRegex.exec(template);
  while (tokenMatch !== null) {
    const key = tokenMatch[1];
    if (!(key in context)) {
      unknownTokens.push(key);
    } else {
      const value = context[key];
      if (typeof value === "string" && value === "" && key.startsWith("sha256")) {
        unknownTokens.push(`${key} (SHA256 未计算)`);
      }
    }
    tokenMatch = tokenRegex.exec(template);
  }

  if (unknownTokens.length > 0) {
    throw new Error(
      `Unknown naming template tokens: {${unknownTokens.join("}, {")}}\n` +
      `Available tokens: {original}, {ext}, {fullname}, ` +
      `{md5_8}, {md5_16}, {md5_32}, {md5}, ` +
      `{sha256_8}, {sha256_16}, {sha256_32}, {sha256_64}, {sha256}, ` +
      `{timestamp}, {timestamp_sec}, {date}, {time}, {datetime}, {iso_date}, ` +
      `{size}, {size_kb}, {size_mb}, {uuid}, {random}`,
    );
  }

  let result = template;
  for (const [key, value] of Object.entries(context)) {
    result = result.split(`{${key}}`).join(String(value));
  }

  return result;
}

/**
 * 解析命名模板并生成最终文件名
 */
export async function resolveNamingTemplate(
  template: string,
  localPath: string,
  options: { computeSha256?: boolean } = {},
): Promise<string> {
  const computeSha256 = options.computeSha256 || /\{sha256/i.test(template);
  const context = await buildTokenContext(localPath, computeSha256);
  return replaceTemplateTokens(template, context);
}

/**
 * 应用命名策略并生成远程路径
 */
export async function applyNamingStrategy(
  options: NamingOptions,
): Promise<string> {
  const {
    localPath,
    uploadPrefix = "",
    namingStrategy = "original+timestamp+hash",
  } = options;

  let filename: string;

  if (typeof namingStrategy === "function") {
    filename = await namingStrategy(localPath);
  } else if (typeof namingStrategy === "string") {
    const preset = TEMPLATE_PRESETS[namingStrategy as keyof typeof TEMPLATE_PRESETS];
    filename = await resolveNamingTemplate(
      preset || namingStrategy,
      localPath,
    );
  } else {
    throw new TypeError(`Invalid naming strategy type: ${typeof namingStrategy}`);
  }

  return uploadPrefix ? `${uploadPrefix}/${filename}` : filename;
}
