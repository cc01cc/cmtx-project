/**
 * @cmtx/upload - 常量定义
 *
 * 集中管理所有常量和默认值
 */

/**
 * 默认的 Alt 文本模板（保持原值）
 */
export const DEFAULT_ALT_TEMPLATE = '{originalAlt}';

/**
 * 默认的 Src URL 模板（使用云端 URL）
 */
export const DEFAULT_SRC_TEMPLATE = '{cloudSrc}';

/**
 * 默认的上传前缀（空字符串 = 不添加前缀）
 */
export const DEFAULT_UPLOAD_PREFIX = '';

/**
 * 默认的删除策略
 */
export const DEFAULT_DELETE_STRATEGY = 'trash' as const;
