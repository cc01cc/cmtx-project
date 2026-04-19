/**
 * Rule 引擎测试
 *
 * @module rule-engine.test
 * @description
 * 测试 RuleEngine 的核心功能。
 */

import { describe, expect, it, vi } from 'vitest';
import { RuleEngine, RuleExecutionError } from '../src/rules/engine.js';
import type { Rule, RuleContext, RuleResult } from '../src/rules/rule-types.js';

describe('RuleEngine', () => {
    describe('Rule 注册', () => {
        it('should register a single rule', () => {
            const engine = new RuleEngine();
            const rule: Rule = {
                id: 'test-rule',
                name: 'Test Rule',
                execute: () => ({ content: 'test', modified: false }),
            };

            engine.register(rule);

            expect(engine.getRule('test-rule')).toBe(rule);
        });

        it('should register multiple rules', () => {
            const engine = new RuleEngine();
            const rules: Rule[] = [
                {
                    id: 'rule-1',
                    name: 'Rule 1',
                    execute: () => ({ content: 'test1', modified: false }),
                },
                {
                    id: 'rule-2',
                    name: 'Rule 2',
                    execute: () => ({ content: 'test2', modified: false }),
                },
            ];

            engine.registerMany(rules);

            expect(engine.getRule('rule-1')).toBe(rules[0]);
            expect(engine.getRule('rule-2')).toBe(rules[1]);
        });

        it('should get all rule IDs', () => {
            const engine = new RuleEngine();
            const rules: Rule[] = [
                { id: 'rule-1', name: 'Rule 1', execute: vi.fn() },
                { id: 'rule-2', name: 'Rule 2', execute: vi.fn() },
            ];

            engine.registerMany(rules);

            expect(engine.getAllRuleIds()).toEqual(['rule-1', 'rule-2']);
        });
    });

    describe('Rule 执行', () => {
        it('should execute a rule', async () => {
            const engine = new RuleEngine();
            const mockExecute = vi.fn().mockReturnValue({
                content: 'modified',
                modified: true,
                messages: ['Modified'],
            });

            engine.register({
                id: 'test-rule',
                name: 'Test Rule',
                execute: mockExecute,
            });

            const context: RuleContext = {
                document: 'original',
                filePath: '/test.md',
            };

            const result = await engine.executeRule('test-rule', context);

            expect(result.modified).toBe(true);
            expect(result.content).toBe('modified');
            expect(mockExecute).toHaveBeenCalled();
        });

        it('should throw error for non-existent rule', async () => {
            const engine = new RuleEngine();

            await expect(
                engine.executeRule('non-existent', {
                    document: 'test',
                    filePath: '/test.md',
                })
            ).rejects.toThrow(RuleExecutionError);
        });

        it('should merge global config with passed config', async () => {
            const engine = new RuleEngine();
            const mockExecute = vi.fn().mockReturnValue({
                content: 'modified',
                modified: true,
            });

            engine.setGlobalConfig({
                'test-rule': {
                    globalValue: 100,
                },
            });

            engine.register({
                id: 'test-rule',
                name: 'Test Rule',
                execute: mockExecute,
            });

            await engine.executeRule(
                'test-rule',
                { document: 'test', filePath: '/test.md' },
                {
                    localValue: 200,
                }
            );

            expect(mockExecute).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    globalValue: 100,
                    localValue: 200,
                })
            );
        });
    });

    describe('Preset 执行', () => {
        it('should execute simple preset (array of IDs)', async () => {
            const engine = new RuleEngine();

            engine.register({
                id: 'rule-1',
                name: 'Rule 1',
                execute: () => ({ content: 'step1', modified: true }),
            });

            engine.register({
                id: 'rule-2',
                name: 'Rule 2',
                execute: () => ({ content: 'step2', modified: true }),
            });

            const result = await engine.executePreset(['rule-1', 'rule-2'], {
                document: 'original',
                filePath: '/test.md',
            });

            expect(result.content).toBe('step2');
            expect(result.results).toHaveLength(2);
        });

        it('should execute full preset (with config)', async () => {
            const engine = new RuleEngine();
            const mockExecute = vi.fn().mockReturnValue({
                content: 'modified',
                modified: true,
            });

            engine.register({
                id: 'test-rule',
                name: 'Test Rule',
                execute: mockExecute,
            });

            const preset = {
                id: 'test-preset',
                name: 'Test Preset',
                steps: [{ id: 'test-rule', enabled: true, config: { value: 100 } }],
            };

            await engine.executePreset(preset, {
                document: 'original',
                filePath: '/test.md',
            });

            expect(mockExecute).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({ value: 100 })
            );
        });

        it('should skip disabled rules', async () => {
            const engine = new RuleEngine();

            engine.register({
                id: 'rule-1',
                name: 'Rule 1',
                execute: () => ({ content: 'step1', modified: true }),
            });

            engine.register({
                id: 'rule-2',
                name: 'Rule 2',
                execute: () => ({ content: 'step2', modified: true }),
            });

            const preset = {
                id: 'test-preset',
                name: 'Test Preset',
                steps: [
                    { id: 'rule-1', enabled: true },
                    { id: 'rule-2', enabled: false },
                ],
            };

            const result = await engine.executePreset(preset, {
                document: 'original',
                filePath: '/test.md',
            });

            expect(result.results).toHaveLength(1);
            expect(result.content).toBe('step1');
        });

        it('should call progress callback', async () => {
            const engine = new RuleEngine();
            const onProgress = vi.fn();

            engine.register({
                id: 'rule-1',
                name: 'Rule 1',
                execute: () => ({ content: 'step1', modified: true }),
            });

            await engine.executePreset(
                ['rule-1'],
                { document: 'original', filePath: '/test.md' },
                onProgress
            );

            expect(onProgress).toHaveBeenCalledWith('rule-1', expect.any(Object));
        });
    });

    describe('Preset 预览', () => {
        it('should preview preset changes', async () => {
            const engine = new RuleEngine();

            engine.register({
                id: 'rule-1',
                name: 'Rule 1',
                execute: () => ({ content: 'modified', modified: true }),
            });

            engine.register({
                id: 'rule-2',
                name: 'Rule 2',
                execute: () => ({ content: 'modified', modified: false }),
            });

            const result = await engine.previewPreset(['rule-1', 'rule-2'], {
                document: 'original',
                filePath: '/test.md',
            });

            expect(result.changes).toHaveLength(2);
            expect(result.changes[0].willModify).toBe(true);
            expect(result.changes[1].willModify).toBe(false);
        });
    });
});
