import { readFile, writeFile } from 'node:fs/promises';
import type { DeleteFileOptions, DeleteFileResult } from '@cmtx/core';
import { deleteLocalImage, deleteLocalImageSafely } from '@cmtx/core';
import type { AdapterUploadResult, IStorageAdapter, UploadBufferOptions } from '@cmtx/storage';
import type { DeleteOptions } from './types.js';

export interface ReplacementOp {
    offset: number;
    length: number;
    newText: string;
}

export interface DocumentAccessor {
    readonly identifier: string;
    readText(): Promise<string>;
    applyReplacements(ops: ReplacementOp[]): Promise<boolean>;
}

export type UploadSource =
    | {
          kind: 'file';
          absPath: string;
      }
    | {
          kind: 'buffer';
          buffer: Buffer;
          ext: string;
      };

export interface UploadStrategy {
    upload(
        source: UploadSource,
        remotePath: string,
        options?: UploadBufferOptions
    ): Promise<AdapterUploadResult>;
}

export interface DeleteStrategy {
    remove(absPath: string): Promise<DeleteFileResult>;
}

export class FileDocumentAccessor implements DocumentAccessor {
    constructor(
        private readonly filePath: string,
        private readonly options?: { writeEnabled?: boolean }
    ) {}

    get identifier(): string {
        return this.filePath;
    }

    async readText(): Promise<string> {
        return await readFile(this.filePath, 'utf-8');
    }

    async applyReplacements(ops: ReplacementOp[]): Promise<boolean> {
        if (ops.length === 0) {
            return false;
        }

        // 如果禁用写入，直接返回 true（内容已在 pipeline 中计算）
        if (this.options?.writeEnabled === false) {
            return true;
        }

        const originalText = await readFile(this.filePath, 'utf-8');
        const sortedOps = [...ops].sort((a, b) => b.offset - a.offset);

        let nextText = originalText;
        for (const op of sortedOps) {
            const before = nextText.slice(0, op.offset);
            const after = nextText.slice(op.offset + op.length);
            nextText = `${before}${op.newText}${after}`;
        }

        await writeFile(this.filePath, nextText, 'utf-8');
        return true;
    }
}

export class StorageUploadStrategy implements UploadStrategy {
    constructor(private readonly adapter: IStorageAdapter) {}

    async upload(
        source: UploadSource,
        remotePath: string,
        options?: UploadBufferOptions
    ): Promise<AdapterUploadResult> {
        if (source.kind === 'file') {
            return await this.adapter.upload(source.absPath, remotePath);
        }

        if (!this.adapter.uploadBuffer) {
            throw new Error('Storage adapter does not support uploadBuffer()');
        }

        return await this.adapter.uploadBuffer(remotePath, source.buffer, options);
    }
}

export class SafeDeleteStrategy implements DeleteStrategy {
    constructor(private readonly options: DeleteOptions) {}

    async remove(absPath: string): Promise<DeleteFileResult> {
        // 将 DeleteConfig 转换为 DeleteFileOptions
        const deleteOptions: DeleteFileOptions = {
            strategy: this.options.strategy === 'trash' ? 'move' : 'hard-delete',
            trashDir: this.options.trashDir,
            maxRetries: this.options.maxRetries,
        };

        if (this.options.rootPath) {
            return await deleteLocalImageSafely(absPath, this.options.rootPath, deleteOptions);
        }

        return await deleteLocalImage(absPath, deleteOptions);
    }
}
