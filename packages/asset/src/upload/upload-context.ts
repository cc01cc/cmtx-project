/**
 * 上传上下文 - 管理整个上传生命周期的共享状态
 *
 * @module upload-context
 * @description
 * 提供上传过程中状态管理和数据共享功能。
 *
 * @remarks
 * ## 核心职责
 *
 * - 存储云端图片映射（本地路径 -> 云端信息）
 * - 管理上传过程中的临时状态
 * - 提供上传结果查询接口
 * - 支持上传去重检查
 *
 * ## 数据结构
 *
 * 使用 Map 存储云端图片映射：
 * - Key: 本地图片绝对路径
 * - Value: {@link ImageCloudMapBody} 云端信息
 *
 * ## 使用场景
 *
 * 1. **上传去重**：检查图片是否已上传
 * 2. **结果查询**：获取特定图片的上传结果
 * 3. **状态管理**：在整个上传流程中传递状态
 * 4. **缓存利用**：避免重复上传相同图片
 *
 * @see {@link UploadContext} - 主要导出类
 * @see {@link ImageCloudMapBody} - 云端信息结构
 * @see {@link recordUpload} - 记录上传结果
 * @see {@link getUploadResult} - 查询上传结果
 */

import type { ImageCloudMapBody } from "./types.js";

export class UploadContext {
    /**
     * 云端图片映射 - key: 本地绝对路径，value: 上传后的云端信息
     */
    private readonly cloudImageMap: Map<string, ImageCloudMapBody> = new Map();

    /**
     * 记录上传结果
     * @param absLocalPath - 本地图片绝对路径
     * @param result - 上传结果
     */
    recordUpload(absLocalPath: string, result: ImageCloudMapBody): void {
        this.cloudImageMap.set(absLocalPath, result);
    }

    /**
     * 获取云端图片映射
     */
    getCloudImageMap(): Map<string, ImageCloudMapBody> {
        return this.cloudImageMap;
    }

    /**
     * 检查图片是否已成功上传
     */
    hasUploadedImage(absLocalPath: string): boolean {
        return this.cloudImageMap.has(absLocalPath);
    }

    /**
     * 获取特定图片的上传结果
     */
    getUploadResult(absLocalPath: string): ImageCloudMapBody | undefined {
        return this.cloudImageMap.get(absLocalPath);
    }
}
