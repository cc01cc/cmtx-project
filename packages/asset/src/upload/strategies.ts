import { readFile } from "node:fs/promises";
import type { AdapterUploadResult, StorageAdapter, UploadBufferOptions } from "@cmtx/storage";
import type { ReplacementOp } from "@cmtx/core";

export type { ReplacementOp };

/**
 * 文档访问器接口
 *
 * @remarks
 * 提供文档的读取和替换操作抽象。
 * 不同实现可以操作内存中的文档（MemoryDocumentAccessor）或文件系统中的文档（FileDocumentAccessor）。
 *
 * @public
 */
export interface DocumentAccessor {
    /** 文档标识符 */
    readonly identifier: string;
    /** 读取文档文本内容 */
    readText(): Promise<string>;
    /** 应用替换操作 */
    applyReplacements(ops: ReplacementOp[]): Promise<boolean>;
}

export type UploadSource =
    | {
          kind: "file";
          absPath: string;
      }
    | {
          kind: "buffer";
          buffer: Buffer;
          ext: string;
      };

export interface UploadStrategy {
    upload(
        source: UploadSource,
        remotePath: string,
        options?: UploadBufferOptions,
    ): Promise<AdapterUploadResult>;
}

export class FileDocumentAccessor implements DocumentAccessor {
    constructor(
        private readonly filePath: string,
        private readonly options?: { writeEnabled?: boolean },
    ) {}

    get identifier(): string {
        return this.filePath;
    }

    async readText(): Promise<string> {
        return await readFile(this.filePath, "utf-8");
    }

    async applyReplacements(_ops: ReplacementOp[]): Promise<boolean> {
        return true;
    }
}

export class StorageUploadStrategy implements UploadStrategy {
    constructor(private readonly adapter: StorageAdapter) {}

    async upload(
        source: UploadSource,
        remotePath: string,
        options?: UploadBufferOptions,
    ): Promise<AdapterUploadResult> {
        if (source.kind === "file") {
            return await this.adapter.upload(source.absPath, remotePath);
        }

        if (!this.adapter.uploadBuffer) {
            throw new Error("Storage adapter does not support uploadBuffer()");
        }

        return await this.adapter.uploadBuffer(remotePath, source.buffer, options);
    }
}
