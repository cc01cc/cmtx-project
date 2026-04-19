// ==================== URL 签名器 ====================

export { type Logger as SignerLogger, UrlSigner } from './url-signer.js';

// ==================== 缓存管理器 ====================

export { type Logger as CacheManagerLogger, UrlCacheManager } from './url-cache-manager.js';

// ==================== 类型定义 ====================

export type {
    /** @category 类型定义 */
    CloudStorageConfig,
    /** @category 类型定义 */
    IUrlCacheManager,
    /** @category 类型定义 */
    /** @category 类型定义 */
    PresignedUrlAdapterOptions,
    /** @category 类型定义 */
    PresignedUrlCache,
    /** @category 类型定义 */
    PresignedUrlCacheItem,
} from './types.js';
