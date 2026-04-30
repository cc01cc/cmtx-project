import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

interface CounterData {
    counters: Record<string, number>;
    lastUpdated: string;
}

/**
 * 计数器管理器
 * 负责管理 .cmtx/data.jsonc 文件的读取、递增和写入
 */
export class CounterManager {
    private readonly dataPath: string;
    private lock: Promise<void> = Promise.resolve();

    constructor(workspaceFolder: string) {
        this.dataPath = join(workspaceFolder, ".cmtx", "data.jsonc");
    }

    /**
     * 获取并递增计数器值
     * @param counterName - 计数器名称
     * @param increment - 递增值，默认为 1
     * @returns 递增后的新值
     */
    async incrementAndGet(counterName: string, increment: number = 1): Promise<number> {
        return this.withLock(async () => {
            const data = await this.readData();
            const currentValue = data.counters[counterName] || 0;
            const newValue = currentValue + increment;
            data.counters[counterName] = newValue;
            data.lastUpdated = new Date().toISOString();
            await this.writeData(data);
            return newValue;
        });
    }

    /**
     * 获取计数器当前值（不递增）
     * @param counterName - 计数器名称
     * @returns 当前计数器值
     */
    async get(counterName: string): Promise<number> {
        const data = await this.readData();
        return data.counters[counterName] || 0;
    }

    /**
     * 设置计数器值
     * @param counterName - 计数器名称
     * @param value - 要设置的值
     */
    async set(counterName: string, value: number): Promise<void> {
        await this.withLock(async () => {
            const data = await this.readData();
            data.counters[counterName] = value;
            data.lastUpdated = new Date().toISOString();
            await this.writeData(data);
        });
    }

    /**
     * 锁机制，防止并发冲突
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

    /**
     * 读取数据文件
     */
    private async readData(): Promise<CounterData> {
        try {
            const content = await readFile(this.dataPath, "utf-8");
            const parsed = JSON.parse(content);

            // 支持新格式：{ counters: {...}, lastUpdated: ... }
            if (parsed.counters && typeof parsed.counters === "object") {
                return parsed;
            }

            // 向后兼容旧格式：直接是数字或 { global: number }
            if (typeof parsed === "number") {
                return {
                    counters: { global: parsed },
                    lastUpdated: new Date().toISOString(),
                };
            }

            return { counters: parsed, lastUpdated: new Date().toISOString() };
        } catch {
            return { counters: {}, lastUpdated: new Date().toISOString() };
        }
    }

    /**
     * 写入数据文件
     */
    private async writeData(data: CounterData): Promise<void> {
        const dir = dirname(this.dataPath);
        if (!existsSync(dir)) {
            await mkdir(dir, { recursive: true });
        }
        await writeFile(this.dataPath, JSON.stringify(data, null, 2), "utf-8");
    }
}
