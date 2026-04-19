/**
 * 全局计数器存储
 *
 * 持久化自增计数器，用于生成唯一 ID
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

/**
 * 计数器存储接口
 *
 * @public
 */
export interface CounterStore {
    /**
     * 获取当前值并递增
     */
    incrementAndGet(increment?: number): Promise<number>;

    /**
     * 获取当前值（不递增）
     */
    get(): Promise<number>;

    /**
     * 设置值
     */
    set(value: number): Promise<void>;
}

/**
 * 文件存储的计数器
 *
 * @public
 */
export class FileCounterStore implements CounterStore {
    private readonly filePath: string;
    private value: number = 0;
    private loaded: boolean = false;
    private lock: Promise<void> = Promise.resolve();

    /**
     * @param filePath - 存储文件路径
     */
    constructor(filePath: string) {
        this.filePath = filePath;
    }

    /**
     * 获取并递增
     */
    async incrementAndGet(increment: number = 1): Promise<number> {
        return this.withLock(async () => {
            await this.ensureLoaded();
            this.value += increment;
            await this.save();
            return this.value;
        });
    }

    /**
     * 获取当前值
     */
    async get(): Promise<number> {
        await this.ensureLoaded();
        return this.value;
    }

    /**
     * 设置值
     */
    async set(value: number): Promise<void> {
        return this.withLock(async () => {
            this.value = value;
            this.loaded = true;
            await this.save();
        });
    }

    /**
     * 确保已加载
     */
    private async ensureLoaded(): Promise<void> {
        if (this.loaded) return;

        try {
            const content = await readFile(this.filePath, 'utf-8');
            const data = JSON.parse(content);
            this.value = typeof data === 'number' ? data : data.global || 0;
        } catch {
            this.value = 0;
        }

        this.loaded = true;
    }

    /**
     * 保存到文件
     */
    private async save(): Promise<void> {
        const dir = dirname(this.filePath);
        await mkdir(dir, { recursive: true });
        await writeFile(this.filePath, JSON.stringify({ global: this.value }, null, 2), 'utf-8');
    }

    /**
     * 锁机制（防止并发）
     */
    private async withLock<T>(fn: () => Promise<T>): Promise<T> {
        const currentLock = this.lock;
        let releaseLock: (() => void) | undefined;

        this.lock = new Promise((resolve) => {
            releaseLock = resolve;
        });

        await currentLock;

        try {
            return await fn();
        } finally {
            releaseLock?.();
        }
    }
}

/**
 * 内存计数器（用于测试）
 *
 * @public
 */
export class MemoryCounterStore implements CounterStore {
    private value: number = 0;

    async incrementAndGet(increment: number = 1): Promise<number> {
        this.value += increment;
        return this.value;
    }

    async get(): Promise<number> {
        return this.value;
    }

    async set(value: number): Promise<void> {
        this.value = value;
    }
}

/**
 * 默认存储路径
 */
export const DEFAULT_COUNTER_PATH = '.cmtx/counter.json';
