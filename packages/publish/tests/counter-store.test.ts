/**
 * Counter Store 单元测试
 */

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FileCounterStore, MemoryCounterStore } from '../src/metadata/counter-store.js';

describe('MemoryCounterStore', () => {
    it('should increment and get value', async () => {
        const store = new MemoryCounterStore();

        const value1 = await store.incrementAndGet();
        expect(value1).toBe(1);

        const value2 = await store.incrementAndGet();
        expect(value2).toBe(2);

        const value3 = await store.incrementAndGet(5);
        expect(value3).toBe(7);
    });

    it('should get current value without incrementing', async () => {
        const store = new MemoryCounterStore();

        await store.incrementAndGet(10);
        const value = await store.get();
        expect(value).toBe(10);
    });

    it('should set value directly', async () => {
        const store = new MemoryCounterStore();

        await store.set(100);
        const value = await store.get();
        expect(value).toBe(100);
    });

    it('should start from 0', async () => {
        const store = new MemoryCounterStore();

        const value = await store.get();
        expect(value).toBe(0);
    });
});

describe('FileCounterStore', () => {
    let tempDir: string;
    let counterFile: string;

    beforeEach(async () => {
        tempDir = await mkdtemp(join(tmpdir(), 'cmtx-counter-test-'));
        counterFile = join(tempDir, 'counter.json');
    });

    afterEach(async () => {
        await rm(tempDir, { recursive: true, force: true });
    });

    it('should increment and get value', async () => {
        const store = new FileCounterStore(counterFile);

        const value1 = await store.incrementAndGet();
        expect(value1).toBe(1);

        const value2 = await store.incrementAndGet();
        expect(value2).toBe(2);
    });

    it('should get current value without incrementing', async () => {
        const store = new FileCounterStore(counterFile);

        await store.incrementAndGet(10);
        const value = await store.get();
        expect(value).toBe(10);
    });

    it('should set value directly', async () => {
        const store = new FileCounterStore(counterFile);

        await store.set(100);
        const value = await store.get();
        expect(value).toBe(100);
    });

    it('should start from 0 when file does not exist', async () => {
        const store = new FileCounterStore(counterFile);

        const value = await store.get();
        expect(value).toBe(0);
    });

    it('should load existing value from file', async () => {
        // Pre-create the counter file
        await writeFile(counterFile, JSON.stringify({ global: 50 }, null, 2));

        const store = new FileCounterStore(counterFile);
        const value = await store.get();
        expect(value).toBe(50);
    });

    it('should load legacy format (plain number)', async () => {
        // Pre-create the counter file with legacy format
        await writeFile(counterFile, '42');

        const store = new FileCounterStore(counterFile);
        const value = await store.get();
        expect(value).toBe(42);
    });

    it('should persist value to file', async () => {
        const store1 = new FileCounterStore(counterFile);
        await store1.incrementAndGet(5);

        // Create new store instance to test persistence
        const store2 = new FileCounterStore(counterFile);
        const value = await store2.get();
        expect(value).toBe(5);
    });

    it('should handle custom increment value', async () => {
        const store = new FileCounterStore(counterFile);

        const value = await store.incrementAndGet(10);
        expect(value).toBe(10);

        const value2 = await store.incrementAndGet(5);
        expect(value2).toBe(15);
    });

    it('should handle concurrent increments', async () => {
        const store = new FileCounterStore(counterFile);

        // Start multiple concurrent increments
        const promises = [
            store.incrementAndGet(1),
            store.incrementAndGet(1),
            store.incrementAndGet(1),
        ];

        const values = await Promise.all(promises);

        // All should succeed with different values
        expect(values).toHaveLength(3);
        expect(new Set(values).size).toBe(3); // All unique

        // Final value should be 3
        const finalValue = await store.get();
        expect(finalValue).toBe(3);
    });
});
