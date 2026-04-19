import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { isUniqueId } from '../src/metadata/id-validator.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const testDir = join(__dirname, '../test-fixtures');

describe('isUniqueId', () => {
    beforeAll(async () => {
        // 创建测试目录
        await mkdir(testDir, { recursive: true });

        // 创建测试文件：具有 ID 的文档
        await writeFile(
            join(testDir, 'doc1.md'),
            `---
id: my-document
title: Test Document 1
---

# Content`
        );

        // 创建测试文件：不同的 ID
        await writeFile(
            join(testDir, 'doc2.md'),
            `---
id: another-doc
title: Test Document 2
---

# Content`
        );

        // 创建测试文件：没有 frontmatter
        await writeFile(
            join(testDir, 'doc3.md'),
            `# No Frontmatter

Content without frontmatter`
        );

        // 创建测试文件：有 frontmatter 但没有 ID
        await writeFile(
            join(testDir, 'doc4.md'),
            `---
title: Document Without ID
---

# Content`
        );

        // 创建测试文件：大小写不同的 ID
        await writeFile(
            join(testDir, 'doc5.md'),
            `---
id: MyDocument
title: Test Document with Different Case
---

# Content`
        );
    });

    afterAll(async () => {
        // 清理测试目录
        await rm(testDir, { recursive: true, force: true });
    });

    it('should return true when ID is unique (not found)', async () => {
        const result = await isUniqueId('unique-id-12345', join(testDir, '**/*.md'));
        expect(result).toBe(true);
    });

    it('should return false when ID already exists', async () => {
        const result = await isUniqueId('my-document', join(testDir, '**/*.md'));
        expect(result).toBe(false);
    });

    it('should handle case-insensitive matching (default behavior)', async () => {
        // 'MY-DOCUMENT' 应该与 'my-document' 匹配（不区分大小写）
        const result1 = await isUniqueId('MY-DOCUMENT', join(testDir, '**/*.md'));
        expect(result1).toBe(false);

        // 'myDocUMENT' 应该与 'MyDocument' 匹配（不区分大小写）
        const result2 = await isUniqueId('myDocUMENT', join(testDir, '**/*.md'));
        expect(result2).toBe(false);
    });

    it('should handle case-sensitive matching when enabled', async () => {
        // 'MY-DOCUMENT' 不应该与 'my-document' 匹配（区分大小写）
        const result1 = await isUniqueId('MY-DOCUMENT', join(testDir, '**/*.md'), {
            caseSensitive: true,
        });
        expect(result1).toBe(true);

        // 'MyDocument' 应该与 'MyDocument' 匹配
        const result2 = await isUniqueId('MyDocument', join(testDir, '**/*.md'), {
            caseSensitive: true,
        });
        expect(result2).toBe(false);
    });

    it('should skip files without frontmatter', async () => {
        // doc3.md 没有 frontmatter，应该被跳过
        const result = await isUniqueId('no-id-field', join(testDir, '**/*.md'));
        expect(result).toBe(true);
    });

    it('should skip files with frontmatter but no ID field', async () => {
        // doc4.md 有 frontmatter 但没有 ID 字段，应该被跳过
        const result = await isUniqueId('doc-without-id', join(testDir, '**/*.md'));
        expect(result).toBe(true);
    });

    it('should return true when no files match the glob pattern', async () => {
        const result = await isUniqueId('any-id', join(testDir, 'non-existent/**/*.md'));
        expect(result).toBe(true);
    });

    it('should handle multiple existing IDs correctly', async () => {
        // 检查第一个 ID
        const result1 = await isUniqueId('my-document', join(testDir, '**/*.md'));
        expect(result1).toBe(false);

        // 检查第二个 ID
        const result2 = await isUniqueId('another-doc', join(testDir, '**/*.md'));
        expect(result2).toBe(false);

        // 检查不存在的 ID
        const result3 = await isUniqueId('non-existent-id', join(testDir, '**/*.md'));
        expect(result3).toBe(true);
    });
});
