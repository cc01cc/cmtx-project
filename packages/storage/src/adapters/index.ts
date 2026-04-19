/**
 * 存储适配器导出
 *
 * @module adapters
 *
 * @description
 * 导出所有支持的存储服务适配器和工厂函数。
 */

export { AliOSSAdapter, type AliOSSClient } from './ali-oss.js';
export { createAdapter } from './factory.js';
export { type CosAdapterConfig, type CosClient, TencentCOSAdapter } from './tencent-cos.js';
