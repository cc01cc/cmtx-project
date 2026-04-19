import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { handler as formatHandler } from '../src/commands/format.js';

describe('format command', () => {
    it('converts markdown images to html and applies width/height', async () => {
        const testDir = await mkdtemp(join(tmpdir(), 'cmtx-cli-format-'));
        const filePath = join(testDir, 'article.md');

        await writeFile(
            filePath,
            ['![cat](./cat.png)', '<img src="./dog.png" alt="dog">'].join('\n'),
            'utf-8'
        );

        await formatHandler({
            filePath,
            to: 'html',
            inPlace: true,
            dryRun: false,
            verbose: false,
            width: '480',
            height: 'auto',
        });

        const output = await readFile(filePath, 'utf-8');

        expect(output).toContain('<img');
        expect(output).toContain('src="./cat.png"');
        expect(output).toContain('src="./dog.png"');
        expect(output).toContain('width="480"');
        expect(output).toContain('height="auto"');

        await rm(testDir, { recursive: true, force: true });
    });

    it('resizes existing html images even when no markdown images need conversion', async () => {
        const testDir = await mkdtemp(join(tmpdir(), 'cmtx-cli-format-'));
        const filePath = join(testDir, 'html-only.md');

        await writeFile(filePath, '<img src="./cover.png" alt="cover">', 'utf-8');

        await formatHandler({
            filePath,
            to: 'html',
            inPlace: true,
            dryRun: false,
            verbose: false,
            width: '60%',
        });

        const output = await readFile(filePath, 'utf-8');

        expect(output).toContain('src="./cover.png"');
        expect(output).toContain('width="60%"');

        await rm(testDir, { recursive: true, force: true });
    });

    it('ignores width/height when converting to markdown', async () => {
        const testDir = await mkdtemp(join(tmpdir(), 'cmtx-cli-format-'));
        const filePath = join(testDir, 'to-markdown.md');

        await writeFile(filePath, '<img src="./a.png" alt="a" width="100">', 'utf-8');

        await formatHandler({
            filePath,
            to: 'markdown',
            inPlace: true,
            dryRun: false,
            verbose: false,
            width: '300',
            height: '200',
        });

        const output = await readFile(filePath, 'utf-8');

        expect(output).toContain('![a](./a.png)');
        expect(output).not.toContain('<img');

        await rm(testDir, { recursive: true, force: true });
    });
});
