/**
 * Metadata Registry 单元测试
 */

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MetadataRegistry } from '../src/metadata/metadata-registry.js';
import type { DocumentState } from '../src/types.js';

describe('MetadataRegistry', () => {
    let tempDir: string;
    let registryFile: string;

    beforeEach(async () => {
        tempDir = await mkdtemp(join(tmpdir(), 'cmtx-registry-test-'));
        registryFile = join(tempDir, 'registry.json');
    });

    afterEach(async () => {
        await rm(tempDir, { recursive: true, force: true });
    });

    describe('load', () => {
        it('should load empty registry when file does not exist', async () => {
            const registry = new MetadataRegistry(registryFile);
            await registry.load();

            expect(registry.keys()).toHaveLength(0);
        });

        it('should load existing registry from file', async () => {
            const data = {
                'doc-1': { hash: 'abc123', version: 1 },
                'doc-2': { hash: 'def456', version: 2 },
            };
            await writeFile(registryFile, JSON.stringify(data, null, 2));

            const registry = new MetadataRegistry(registryFile);
            await registry.load();

            expect(registry.keys()).toHaveLength(2);
            expect(registry.get('doc-1')).toEqual({ hash: 'abc123', version: 1 });
            expect(registry.get('doc-2')).toEqual({ hash: 'def456', version: 2 });
        });
    });

    describe('save', () => {
        it('should save registry to file', async () => {
            const registry = new MetadataRegistry(registryFile);
            await registry.load();

            registry.set('doc-1', { hash: 'abc123', version: 1 });
            await registry.save();

            // Create new instance and verify
            const registry2 = new MetadataRegistry(registryFile);
            await registry2.load();
            expect(registry2.get('doc-1')).toEqual({ hash: 'abc123', version: 1 });
        });

        it('should not save empty registry', async () => {
            const registry = new MetadataRegistry(registryFile);
            await registry.load();
            await registry.save();

            // File should not exist
            const registry2 = new MetadataRegistry(registryFile);
            await registry2.load();
            expect(registry2.keys()).toHaveLength(0);
        });
    });

    describe('get', () => {
        it('should return undefined for non-existent ID', async () => {
            const registry = new MetadataRegistry(registryFile);
            await registry.load();

            const state = registry.get('non-existent');
            expect(state).toBeUndefined();
        });

        it('should return state for existing ID', async () => {
            const registry = new MetadataRegistry(registryFile);
            await registry.load();

            const docState: DocumentState = { hash: 'abc123', version: 1 };
            registry.set('doc-1', docState);

            const retrieved = registry.get('doc-1');
            expect(retrieved).toEqual(docState);
        });
    });

    describe('set', () => {
        it('should set new state', async () => {
            const registry = new MetadataRegistry(registryFile);
            await registry.load();

            const docState: DocumentState = { hash: 'abc123', version: 1 };
            registry.set('doc-1', docState);

            expect(registry.get('doc-1')).toEqual(docState);
        });

        it('should update existing state', async () => {
            const registry = new MetadataRegistry(registryFile);
            await registry.load();

            registry.set('doc-1', { hash: 'abc123', version: 1 });
            registry.set('doc-1', { hash: 'def456', version: 2 });

            expect(registry.get('doc-1')).toEqual({ hash: 'def456', version: 2 });
        });
    });

    describe('delete', () => {
        it('should delete existing state', async () => {
            const registry = new MetadataRegistry(registryFile);
            await registry.load();

            registry.set('doc-1', { hash: 'abc123', version: 1 });
            const deleted = registry.delete('doc-1');

            expect(deleted).toBe(true);
            expect(registry.get('doc-1')).toBeUndefined();
        });

        it('should return false for non-existent ID', async () => {
            const registry = new MetadataRegistry(registryFile);
            await registry.load();

            const deleted = registry.delete('non-existent');
            expect(deleted).toBe(false);
        });
    });

    describe('keys', () => {
        it('should return empty array for empty registry', async () => {
            const registry = new MetadataRegistry(registryFile);
            await registry.load();

            expect(registry.keys()).toEqual([]);
        });

        it('should return all keys', async () => {
            const registry = new MetadataRegistry(registryFile);
            await registry.load();

            registry.set('doc-1', { hash: 'abc123', version: 1 });
            registry.set('doc-2', { hash: 'def456', version: 2 });
            registry.set('doc-3', { hash: 'ghi789', version: 3 });

            const keys = registry.keys();
            expect(keys).toHaveLength(3);
            expect(keys).toContain('doc-1');
            expect(keys).toContain('doc-2');
            expect(keys).toContain('doc-3');
        });
    });

    describe('integration', () => {
        it('should handle full lifecycle', async () => {
            // Create and populate registry
            const registry1 = new MetadataRegistry(registryFile);
            await registry1.load();

            registry1.set('post-1', { hash: 'hash1', version: 1 });
            registry1.set('post-2', { hash: 'hash2', version: 1 });
            await registry1.save();

            // Load in new instance
            const registry2 = new MetadataRegistry(registryFile);
            await registry2.load();

            expect(registry2.get('post-1')).toEqual({ hash: 'hash1', version: 1 });
            expect(registry2.get('post-2')).toEqual({ hash: 'hash2', version: 1 });

            // Update and save
            registry2.set('post-1', { hash: 'hash1-v2', version: 2 });
            registry2.delete('post-2');
            await registry2.save();

            // Verify in third instance
            const registry3 = new MetadataRegistry(registryFile);
            await registry3.load();

            expect(registry3.get('post-1')).toEqual({ hash: 'hash1-v2', version: 2 });
            expect(registry3.get('post-2')).toBeUndefined();
        });
    });
});
