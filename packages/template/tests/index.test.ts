/**
 * 模块导出测试
 *
 * 验证所有公共 API 是否正确导出
 */

import { describe, expect, it } from 'vitest';
// 测试默认导出
// 测试命名导出
import defaultExport, {
    BaseTemplateBuilder,
    BuiltinVariables,
    ContextManager,
    renderTemplate,
    type TemplateContext,
    type TemplateEngine,
    type ValidationResult,
} from '../src/index.js';

describe('模块导出测试', () => {
    describe('默认导出', () => {
        it('应该导出 renderTemplate 作为默认导出', () => {
            expect(defaultExport).toBe(renderTemplate);
            expect(typeof defaultExport).toBe('function');
        });
    });

    describe('核心功能导出', () => {
        it('应该导出 renderTemplate 函数', () => {
            expect(typeof renderTemplate).toBe('function');
        });

        it('应该导出 ContextManager 类', () => {
            expect(typeof ContextManager).toBe('function');
            expect(new ContextManager()).toBeInstanceOf(ContextManager);
        });

        it('应该导出 BuiltinVariables 类', () => {
            expect(typeof BuiltinVariables).toBe('function');
            expect(typeof BuiltinVariables.getDate).toBe('function');
            expect(typeof BuiltinVariables.getTimestamp).toBe('function');
            expect(typeof BuiltinVariables.getUUID).toBe('function');
            expect(typeof BuiltinVariables.getAll).toBe('function');
        });

        it('应该导出 BaseTemplateBuilder 类', () => {
            expect(typeof BaseTemplateBuilder).toBe('function');
        });
    });

    describe('类型导出', () => {
        it('应该导出 TemplateContext 类型', () => {
            // 类型测试在编译时验证，这里只验证类型存在
            const context: TemplateContext = { key: 'value' };
            expect(context).toBeDefined();
        });

        it('应该导出 TemplateEngine 类型', () => {
            // 类型测试在编译时验证
            const engine: TemplateEngine = {
                render: (template: string, context: TemplateContext) => template,
                validate: (template: string) => ({ isValid: true, errors: [] }),
            };
            expect(typeof engine.render).toBe('function');
            expect(typeof engine.validate).toBe('function');
        });

        it('应该导出 ValidationResult 类型', () => {
            // 类型测试在编译时验证
            const result: ValidationResult = {
                isValid: true,
                errors: [],
            };
            expect(result.isValid).toBe(true);
        });
    });
});
