/**
 * 多组正则表达式替换功能测试套件
 *
 * @remarks
 * 测试多组正则表达式替换的核心功能，包括：
 * 1. 基础替换功能
 * 2. 多规则顺序执行
 * 3. 捕获组引用支持
 * 4. 边界情况处理
 */

import { describe, expect, it } from 'vitest';
import { findAllMatches, replaceWithMultipleRegex } from '../src/multi-regex.js';
import type { MultiRegexRule } from '../src/types.js';

describe('多组正则表达式替换 (MVP版本)', () => {
    it('应该正确应用单个规则', () => {
        const result = replaceWithMultipleRegex('hello world', {
            rules: [{ pattern: /world/g, replacement: 'universe' }],
        });

        expect(result.newText).toBe('hello universe');
        expect(result.totalReplacements).toBe(1);
        expect(result.ruleDetails).toHaveLength(1);
        expect(result.ruleDetails[0].appliedCount).toBe(1);
    });

    it('应该按顺序应用多个规则', () => {
        const result = replaceWithMultipleRegex('abc def', {
            rules: [
                { pattern: /abc/g, replacement: 'xyz' },
                { pattern: /def/g, replacement: 'uvw' },
            ],
        });

        expect(result.newText).toBe('xyz uvw');
        expect(result.totalReplacements).toBe(2);
        expect(result.ruleDetails).toHaveLength(2);
        expect(result.ruleDetails[0].appliedCount).toBe(1);
        expect(result.ruleDetails[1].appliedCount).toBe(1);
    });

    it('应该支持捕获组引用', () => {
        const result = replaceWithMultipleRegex('John Doe', {
            rules: [{ pattern: /(\w+) (\w+)/g, replacement: '$2, $1' }],
        });

        expect(result.newText).toBe('Doe, John');
        expect(result.totalReplacements).toBe(1);
    });

    it('应该处理无匹配情况', () => {
        const result = replaceWithMultipleRegex('no match here', {
            rules: [{ pattern: /nonexistent/g, replacement: 'replacement' }],
        });

        expect(result.newText).toBe('no match here');
        expect(result.totalReplacements).toBe(0);
        expect(result.ruleDetails[0].appliedCount).toBe(0);
    });

    it('应该支持多次匹配同一规则', () => {
        const result = replaceWithMultipleRegex('test test test', {
            rules: [{ pattern: /test/g, replacement: 'demo' }],
        });

        expect(result.newText).toBe('demo demo demo');
        expect(result.totalReplacements).toBe(3);
        expect(result.ruleDetails[0].appliedCount).toBe(3);
    });

    it('应该支持带ID的规则', () => {
        const ruleId = 'custom-rule-id';
        const result = replaceWithMultipleRegex('hello world', {
            rules: [{ id: ruleId, pattern: /world/g, replacement: 'universe' }],
        });

        expect(result.ruleDetails[0].ruleId).toBe(ruleId);
    });

    it('应该支持字符串模式', () => {
        const result = replaceWithMultipleRegex('hello world', {
            rules: [{ pattern: 'world', replacement: 'universe' }],
        });

        expect(result.newText).toBe('hello universe');
    });

    it('应该处理空规则数组', () => {
        const originalText = 'original text';
        const result = replaceWithMultipleRegex(originalText, {
            rules: [],
        });

        expect(result.newText).toBe(originalText);
        expect(result.totalReplacements).toBe(0);
        expect(result.ruleDetails).toHaveLength(0);
    });

    it('应该正确处理复杂Markdown文本', () => {
        const markdown = '# 原始标题\n\n这是 ![旧图片](old.png) 和另一个 ![图片](image.jpg)';
        const result = replaceWithMultipleRegex(markdown, {
            rules: [
                { id: 'title-update', pattern: /^# .*$/m, replacement: '# 更新后的标题' },
                {
                    id: 'image-replace',
                    pattern: /!\[([^\]]*)\]\(old\.png\)/g,
                    replacement: '![$1](new.png)',
                },
                { id: 'jpg-to-webp', pattern: /\.jpg/g, replacement: '.webp' },
            ],
        });

        expect(result.newText).toContain('# 更新后的标题');
        expect(result.newText).toContain('![旧图片](new.png)');
        expect(result.newText).toContain('![图片](image.webp)');
        expect(result.totalReplacements).toBe(3);
    });

    it('应该根据order参数排序执行规则', () => {
        // 使用带id的规则以便测试
        const result = replaceWithMultipleRegex('first second third', {
            rules: [
                { id: 'rule-third', pattern: /third/g, replacement: 'fourth', order: 2 },
                { id: 'rule-first', pattern: /first/g, replacement: 'second', order: 1 },
            ],
        });

        expect(result.newText).toBe('second second fourth');
        // 验证执行顺序：order小的先执行
        expect(result.ruleDetails[0].ruleId).toBe('rule-first'); // order: 1 的规则先执行
        expect(result.ruleDetails[1].ruleId).toBe('rule-third'); // order: 2 的规则后执行
    });

    it('应该混合处理有order和无order的规则', () => {
        // 设计一个能验证执行顺序的测试
        const result = replaceWithMultipleRegex('start', {
            rules: [
                { id: 'rule-last', pattern: /middle/g, replacement: 'end' }, // 无order，最后执行
                { id: 'rule-second', pattern: /next/g, replacement: 'middle', order: 2 },
                { id: 'rule-first', pattern: /start/g, replacement: 'next', order: 1 },
            ],
        });

        expect(result.newText).toBe('end');
        // 验证执行顺序：order: 1(start->next) -> order: 2(next->middle) -> 无order(middle->end)
        expect(result.ruleDetails[0].ruleId).toBe('rule-first');
        expect(result.ruleDetails[1].ruleId).toBe('rule-second');
        expect(result.ruleDetails[2].ruleId).toBe('rule-last');
    });

    it('应该处理相同的order值（按数组顺序）', () => {
        const result = replaceWithMultipleRegex('abc', {
            rules: [
                { pattern: /c/g, replacement: 'C', order: 1 },
                { pattern: /b/g, replacement: 'B', order: 1 },
                { pattern: /a/g, replacement: 'A', order: 1 },
            ],
        });

        // 相同order值按数组顺序执行
        expect(result.newText).toBe('ABC');
    });
});

describe('边界情况测试', () => {
    it('应该处理特殊字符', () => {
        const result = replaceWithMultipleRegex('price: VALUE100 & tax: VALUE20', {
            rules: [
                { pattern: /VALUE(\d+)/g, replacement: 'NUMBER$1' }, // 捕获组引用
            ],
        });

        expect(result.newText).toBe('price: NUMBER100 & tax: NUMBER20');
    });

    it('应该处理空字符串输入', () => {
        const result = replaceWithMultipleRegex('', {
            rules: [{ pattern: /test/g, replacement: 'demo' }],
        });

        expect(result.newText).toBe('');
        expect(result.totalReplacements).toBe(0);
    });

    it('应该处理包含换行符的文本', () => {
        const multilineText = 'line1\nline2\nline3';
        const result = replaceWithMultipleRegex(multilineText, {
            rules: [{ pattern: /line/g, replacement: 'row' }],
        });

        expect(result.newText).toBe('row1\nrow2\nrow3');
        expect(result.totalReplacements).toBe(3);
    });

    it('应该正确处理正则表达式标志', () => {
        const result = replaceWithMultipleRegex('Test TEST test', {
            rules: [{ pattern: /test/gi, replacement: 'demo' }],
        });

        expect(result.newText).toBe('demo demo demo');
        expect(result.totalReplacements).toBe(3);
    });
});

describe('findAllMatches 查询功能', () => {
    it('应该正确查找所有匹配项', () => {
        const result = findAllMatches('Hello World! Hello Universe!', {
            rules: [
                { pattern: /Hello (\w+)!/g, id: 'greeting' },
                { pattern: /World/g, id: 'world' },
            ],
        });

        expect(result.matches).toHaveLength(3);
        // 验证匹配项内容和顺序
        expect(result.matches[0].matchedText).toBe('Hello World!');
        expect(result.matches[0].groups).toEqual(['Hello World!', 'World']);
        expect(result.matches[0].index).toBe(0);
        expect(result.matches[0].endIndex).toBe(12);
        expect(result.matches[1].matchedText).toBe('World');
        expect(result.matches[1].groups).toEqual(['World']);
        expect(result.matches[2].matchedText).toBe('Hello Universe!');
        expect(result.matches[2].groups).toEqual(['Hello Universe!', 'Universe']);

        // 验证统计信息
        expect(result.statistics.greeting.count).toBe(2);
        expect(result.statistics.world.count).toBe(1);
        expect(result.statistics.greeting.sampleMatches).toContain('Hello World!');
    });

    it('应该支持order参数排序统计', () => {
        const result = findAllMatches('test content', {
            rules: [
                { pattern: /content/g, id: 'second', order: 2 },
                { pattern: /test/g, id: 'first', order: 1 },
            ],
        });

        // 验证统计信息包含order信息
        expect(result.statistics.first.order).toBe(1);
        expect(result.statistics.second.order).toBe(2);
        // 验证匹配项按文本位置排序，不是按order排序
        expect(result.matches[0].ruleId).toBe('first');
        expect(result.matches[1].ruleId).toBe('second');
    });

    it('应该处理无匹配情况', () => {
        const result = findAllMatches('no matches here', {
            rules: [{ pattern: /nonexistent/g, id: 'test' }],
        });

        expect(result.matches).toHaveLength(0);
        expect(result.statistics.test.count).toBe(0);
        expect(result.statistics.test.sampleMatches).toHaveLength(0);
    });

    it('应该正确处理捕获组', () => {
        const result = findAllMatches('John Doe, Jane Smith', {
            rules: [{ pattern: /(\w+) (\w+)/g, id: 'names' }],
        });

        expect(result.matches).toHaveLength(2);
        expect(result.matches[0].groups).toEqual(['John Doe', 'John', 'Doe']);
        expect(result.matches[1].groups).toEqual(['Jane Smith', 'Jane', 'Smith']);
        expect(result.statistics.names.count).toBe(2);
    });

    it('应该限制样本数量', () => {
        const longText = 'test '.repeat(10); // 10个"test "
        const result = findAllMatches(longText, {
            rules: [{ pattern: /test/g, id: 'many' }],
        });

        expect(result.statistics.many.count).toBe(10);
        expect(result.statistics.many.sampleMatches.length).toBe(5); // 最多5个样本
    });

    it('应该返回原始文本', () => {
        const originalText = 'Hello World!';
        const result = findAllMatches(originalText, {
            rules: [{ pattern: /World/g, id: 'test' }],
        });

        expect(result.originalText).toBe(originalText);
    });
});
