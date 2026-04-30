/**
 * 内存文档访问器
 *
 * @module memory-document-accessor
 * @description
 * 实现 DocumentAccessor 接口，用于在内存中处理文档内容。
 */

import type { ReplacementOp } from "@cmtx/asset/upload";

/**
 * DocumentAccessor 接口
 */
export interface DocumentAccessor {
    /** 读取文档文本内容 */
    readText(): Promise<string>;
    /** 应用替换操作 */
    applyReplacements(ops: ReplacementOp[]): Promise<boolean>;
    /** 标识符 */
    identifier: string;
}

/**
 * 内存文档访问器实现
 *
 * 用于在 Rule 执行过程中对文档内容进行内存中的替换操作
 */
export class MemoryDocumentAccessor implements DocumentAccessor {
    private content: string;
    public readonly identifier: string;

    constructor(initialContent: string, identifier?: string) {
        this.content = initialContent;
        this.identifier = identifier ?? "memory-document";
    }

    /**
     * 读取文档文本内容
     */
    async readText(): Promise<string> {
        return this.content;
    }

    /**
     * 应用替换操作
     *
     * @param ops - 替换操作列表
     * @returns 是否成功应用
     */
    async applyReplacements(ops: ReplacementOp[]): Promise<boolean> {
        if (ops.length === 0) {
            return false;
        }

        // 按 offset 降序排序，从后往前替换
        const sortedOps = [...ops].sort((a, b) => b.offset - a.offset);

        for (const op of sortedOps) {
            const before = this.content.slice(0, op.offset);
            const after = this.content.slice(op.offset + op.length);
            this.content = `${before}${op.newText}${after}`;
        }

        return true;
    }
}
