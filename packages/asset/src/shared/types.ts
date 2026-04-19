/**
 * 共享类型定义
 *
 * @module shared/types
 * @description
 * 定义 Upload 和 Download 模块共用的类型接口。
 */

/**
 * 命名模板基础变量
 *
 * @description
 * Upload 和 Download 共有的模板变量，确保命名一致性。
 *
 * ## 支持的模板变量
 *
 * | 变量 | 说明 | 示例 |
 * |------|------|------|
 * | `{name}` | 文件名（不含扩展名） | `photo` |
 * | `{ext}` | 文件扩展名（不含点） | `png` |
 * | `{date}` | 日期（YYYY-MM-DD） | `2026-04-02` |
 * | `{timestamp}` | 时间戳（毫秒） | `1712060123456` |
 * | `{md5}` | 完整 MD5 哈希（32 位） | `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6` |
 * | `{md5_8}` | MD5 前 8 位 | `a1b2c3d4` |
 * | `{md5_16}` | MD5 前 16 位 | `a1b2c3d4e5f6g7h8` |
 *
 * @remarks
 * ## 使用继承的原因
 *
 * 使用继承可以：
 * 1. 确保两边变量命名自动一致
 * 2. 避免手动对齐导致的错误
 * 3. 便于后续扩展共有变量
 *
 * ## 为什么使用 `{md5_8}` 而非 `{hash}`
 *
 * `{hash}` 命名不明确，无法区分是 MD5、SHA256 还是其他算法。
 * 使用 `{md5_8}` 明确表示使用 MD5 算法的前 8 位。
 *
 * ## 为什么 `{ext}` 不含点
 *
 * 遵循构建工具惯例（Webpack, Rollup, Vite, Hugo），模板更直观：
 * - `{name}.{ext}` → `photo.png` ✅
 * - 而非 `{name}{ext}` → `photo.png` ❌ 不够直观
 */
export interface BaseNamingVariables extends Record<string, string> {
    /** 文件名（不含扩展名） */
    name: string;

    /** 文件扩展名（不含点，如 png） */
    ext: string;

    /** 日期（YYYY-MM-DD 格式） */
    date: string;

    /** 时间戳（毫秒） */
    timestamp: string;

    /** 完整 MD5 哈希（32 位） */
    md5: string;

    /** MD5 前 8 位 */
    md5_8: string;

    /** MD5 前 16 位 */
    md5_16: string;
}
