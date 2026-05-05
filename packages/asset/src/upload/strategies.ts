import { readFile, writeFile } from "node:fs/promises";
import type { AdapterUploadResult, IStorageAdapter, UploadBufferOptions } from "@cmtx/storage";

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
    constructor(private readonly adapter: IStorageAdapter) {}

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
