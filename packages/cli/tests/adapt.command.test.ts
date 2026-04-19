import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { applyAdaptRules } from '@cmtx/publish';
import { loadAdaptConfigFromFile } from '@cmtx/publish/node';
import { describe, expect, it } from 'vitest';
import { handler as adaptHandler } from '../src/commands/adapt.js';

// ---------------------------------------------------------------------------
// Unit tests: applyAdaptRules
// ---------------------------------------------------------------------------

describe('applyAdaptRules', () => {
    it('applies a single rule globally', () => {
        const rules = [{ match: '^## (.+)$', replace: '# $1', flags: 'gm' }];
        const input = '## Hello\n\n## World';
        expect(applyAdaptRules(input, rules).content).toBe('# Hello\n\n# World');
    });

    it('applies rules sequentially (order matters for heading promotion)', () => {
        // Zhihu-style promotion: h2->h1 first, then h3->h2
        const rules = [
            { match: '^## (.+)$', replace: '# $1', flags: 'gm' },
            { match: '^### (.+)$', replace: '## $1', flags: 'gm' },
        ];
        const input = '## Section\n### Sub\n#### Deep';
        const result = applyAdaptRules(input, rules);
        // h2 -> h1, h3 -> h2, h4 untouched by these two rules
        expect(result.content).toBe('# Section\n## Sub\n#### Deep');
    });

    it('strips frontmatter', () => {
        const rules = [{ match: String.raw`^---[\s\S]*?---\n+`, replace: '', flags: 'g' }];
        const input = '---\ntitle: My Post\ndate: 2026-01-01\n---\n\n## Body';
        expect(applyAdaptRules(input, rules).content).toBe('## Body');
    });

    it('returns unchanged content when rules array is empty', () => {
        const content = '# Hello\n\nSome text.';
        expect(applyAdaptRules(content, []).content).toBe(content);
    });
});

// ---------------------------------------------------------------------------
// Unit tests: loadAdaptConfig validation
// ---------------------------------------------------------------------------

describe('loadAdaptConfig', () => {
    it('loads a valid YAML rule file', async () => {
        const dir = await mkdtemp(join(tmpdir(), 'cmtx-adapt-'));
        const ruleFile = join(dir, 'test.adapt.yaml');

        await writeFile(
            ruleFile,
            [
                'version: v1',
                'rules:',
                '  - name: h2 to h1',
                '    match: "^## (.+)$"',
                '    replace: "# $1"',
                '    flags: "gm"',
            ].join('\n'),
            'utf-8'
        );

        const config = await loadAdaptConfigFromFile(ruleFile);
        expect(config.rules).toHaveLength(1);
        expect(config.rules[0].match).toBe('^## (.+)$');
        expect(config.rules[0].replace).toBe('# $1');

        await rm(dir, { recursive: true, force: true });
    });

    it('throws when "rules" array is missing', async () => {
        const dir = await mkdtemp(join(tmpdir(), 'cmtx-adapt-'));
        const ruleFile = join(dir, 'bad.yaml');
        await writeFile(ruleFile, 'version: v1\n', 'utf-8');

        await expect(loadAdaptConfigFromFile(ruleFile)).rejects.toThrow(/rules/);

        await rm(dir, { recursive: true, force: true });
    });

    it('throws when a rule has invalid regex', async () => {
        const dir = await mkdtemp(join(tmpdir(), 'cmtx-adapt-'));
        const ruleFile = join(dir, 'bad-regex.yaml');

        await writeFile(
            ruleFile,
            ['rules:', '  - match: "[unclosed"', '    replace: "x"'].join('\n'),
            'utf-8'
        );

        await expect(loadAdaptConfigFromFile(ruleFile)).rejects.toThrow(/invalid regex/i);

        await rm(dir, { recursive: true, force: true });
    });
});

// ---------------------------------------------------------------------------
// Integration tests: handler
// ---------------------------------------------------------------------------

describe('adapt command handler', () => {
    it('writes adapted file to --out path', async () => {
        const dir = await mkdtemp(join(tmpdir(), 'cmtx-adapt-handler-'));
        const inputFile = join(dir, 'article.md');
        const ruleFile = join(dir, 'rules.yaml');
        const outFile = join(dir, 'output', 'article.md');

        await writeFile(inputFile, '## Section\n### Sub\n', 'utf-8');
        await writeFile(
            ruleFile,
            ['rules:', '  - match: "^## (.+)$"', '    replace: "# $1"'].join('\n'),
            'utf-8'
        );

        await adaptHandler({
            input: inputFile,
            ruleFile,
            out: outFile,
            dryRun: false,
            verbose: false,
        });

        const result = await readFile(outFile, 'utf-8');
        expect(result).toContain('# Section');
        expect(result).toContain('### Sub'); // not touched by this rule

        await rm(dir, { recursive: true, force: true });
    });

    it('writes all .md files to --out-dir when input is a directory', async () => {
        const dir = await mkdtemp(join(tmpdir(), 'cmtx-adapt-dir-'));
        const inputDir = join(dir, 'src');
        const outDir = join(dir, 'out');
        const ruleFile = join(dir, 'rules.yaml');

        const { mkdir } = await import('node:fs/promises');
        await mkdir(inputDir, { recursive: true });

        await writeFile(join(inputDir, 'a.md'), '## Alpha\n', 'utf-8');
        await writeFile(join(inputDir, 'b.md'), '## Beta\n', 'utf-8');
        await writeFile(
            ruleFile,
            ['rules:', '  - match: "^## (.+)$"', '    replace: "# $1"'].join('\n'),
            'utf-8'
        );

        await adaptHandler({
            input: inputDir,
            ruleFile,
            outDir,
            dryRun: false,
            verbose: false,
        });

        const a = await readFile(join(outDir, 'a.md'), 'utf-8');
        const b = await readFile(join(outDir, 'b.md'), 'utf-8');
        expect(a).toBe('# Alpha\n');
        expect(b).toBe('# Beta\n');

        await rm(dir, { recursive: true, force: true });
    });

    // Note: Platform-based tests removed - builtin platform integration needs refactoring
    // See: PLAN-005 for CLI refactoring plan

    it('checks markdown against built-in platform validators', async () => {
        const dir = await mkdtemp(join(tmpdir(), 'cmtx-adapt-check-'));
        const inputFile = join(dir, 'article.md');

        await writeFile(inputFile, '# Section\n', 'utf-8');

        const originalExitCode = process.exitCode;
        process.exitCode = undefined;

        await adaptHandler({
            input: inputFile,
            platform: 'wechat',
            check: true,
            dryRun: false,
            verbose: false,
        } as never);

        expect(process.exitCode).toBe(1);
        process.exitCode = originalExitCode;

        await rm(dir, { recursive: true, force: true });
    });

    // Note: Platform-based render tests removed - builtin platform integration needs refactoring
    // See: PLAN-005 for CLI refactoring plan

    it('fails when neither --rule-file nor --platform is provided', async () => {
        const dir = await mkdtemp(join(tmpdir(), 'cmtx-adapt-missing-mode-'));
        const inputFile = join(dir, 'article.md');

        await writeFile(inputFile, '## Section\n', 'utf-8');

        const originalExitCode = process.exitCode;
        process.exitCode = undefined;

        await adaptHandler({
            input: inputFile,
            dryRun: true,
            verbose: false,
        } as never);

        expect(process.exitCode).toBe(1);
        process.exitCode = originalExitCode;

        await rm(dir, { recursive: true, force: true });
    });
});
