/**
 * 图片处理 Rules
 *
 * @module image-rules
 * @description
 * 提供图片处理相关的 Rules，如转换 HTML、上传等。
 */

import type { Rule, RuleContext, RuleResult } from '../rule-types.js';

/**
 * 图片转 HTML Rule 配置
 */
interface ConvertImagesConfig {
    /** 是否转换为 HTML */
    convertToHtml?: boolean;
}

/**
 * 图片转 HTML Rule
 */
export const convertImagesRule: Rule = {
    id: 'convert-images',
    name: '图片转 HTML',
    description: '将 Markdown 图片语法转换为 HTML img 标签',

    execute(context: RuleContext, config?: ConvertImagesConfig): RuleResult {
        const { document } = context;
        const convertToHtml = config?.convertToHtml ?? true;

        if (!convertToHtml) {
            return {
                content: document,
                modified: false,
                messages: ['未启用转换'],
            };
        }

        // Markdown 图片语法: ![alt](url "title")
        const markdownImageRegex = /!\[([^\]]*)\]\(([^)"]+)(?:\s+"([^"]*)")?\)/g;

        let newContent = document;
        let matchCount = 0;

        newContent = document.replace(markdownImageRegex, (_match, alt, url, title) => {
            matchCount++;
            const titleAttr = title ? ` title="${title}"` : '';
            return `<img src="${url}" alt="${alt}"${titleAttr} />`;
        });

        const modified = newContent !== document;

        return {
            content: newContent,
            modified,
            messages: modified ? [`转换了 ${matchCount} 个图片`] : ['没有 Markdown 图片需要转换'],
        };
    },
};

/**
 * 图片上传 Rule 配置
 */
interface UploadImagesConfig {
    /** 图片宽度 */
    width?: number;

    /** 是否上传 */
    upload?: boolean;
}

/**
 * 图片上传 Rule
 * TODO: 需要实现实际上传逻辑
 */
export const uploadImagesRule: Rule = {
    id: 'upload-images',
    name: '上传图片',
    description: '上传本地图片到云端存储',

    async execute(context: RuleContext, config?: UploadImagesConfig): Promise<RuleResult> {
        const { document, storage } = context;
        const _width = config?.width;
        const shouldUpload = config?.upload ?? true;

        if (!shouldUpload) {
            return {
                content: document,
                modified: false,
                messages: ['未启用上传'],
            };
        }

        if (!storage) {
            return {
                content: document,
                modified: false,
                messages: ['缺少 storage 配置，跳过上传'],
            };
        }

        // TODO: 实现图片上传逻辑
        // 1. 提取文档中的本地图片路径
        // 2. 上传到 storage
        // 3. 替换为云端 URL
        // 4. 如果设置了 width，添加 width 属性

        return {
            content: document,
            modified: false,
            messages: ['图片上传功能待实现'],
        };
    },
};

/**
 * 导出所有图片处理 Rules
 */
export const imageRules: Rule[] = [convertImagesRule, uploadImagesRule];
