import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { DocumentState } from '../types.js';

/**
 * 元数据注册表 (Metadata Registry)
 *
 * @description
 * 负责持久化存储文档的状态（哈希、版本等），实现"源文件清洁"。
 *
 * @example
 * ```typescript
 * const registry = new MetadataRegistry('.cmtx/inventory.json');
 * await registry.load();
 * const state = registry.get('my-post-id');
 * ```
 *
 * @public
 */
export class MetadataRegistry {
    private states = new Map<string, DocumentState>();

    /**
     * @param registryPath - 注册表 JSON 文件的绝对或相对路径
     */
    constructor(private readonly registryPath: string) {}

    /**
     * 加载注册表
     */
    async load(): Promise<void> {
        try {
            const content = await readFile(this.registryPath, 'utf-8');
            const data = JSON.parse(content);
            this.states = new Map(Object.entries(data));
        } catch (error: unknown) {
            if (typeof error === 'object' && error !== null && 'code' in error) {
                const err = error as { code: string; message: string };
                if (err.code !== 'ENOENT') {
                    console.error(`[WARN] Failed to load registry: ${err.message}`);
                }
            }
            this.states = new Map();
        }
    }

    /**
     * 保存注册表
     */
    async save(): Promise<void> {
        if (this.states.size === 0) return;

        try {
            const dir = dirname(this.registryPath);
            await mkdir(dir, { recursive: true });
            const data = Object.fromEntries(this.states);
            await writeFile(this.registryPath, JSON.stringify(data, null, 2), 'utf-8');
        } catch (error: unknown) {
            console.error(`[FAIL] Failed to save registry: ${(error as Error).message}`);
        }
    }

    /**
     * 获取指定 ID 的状态
     */
    get(id: string): DocumentState | undefined {
        return this.states.get(id);
    }

    /**
     * 更新或设置状态
     */
    set(id: string, state: DocumentState): void {
        this.states.set(id, state);
    }

    /**
     * 删除状态
     */
    delete(id: string): boolean {
        return this.states.delete(id);
    }

    /**
     * 获取所有 ID
     */
    keys(): string[] {
        return Array.from(this.states.keys());
    }
}
