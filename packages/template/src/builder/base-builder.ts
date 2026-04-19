import { BuiltinVariables, ContextManager } from '../core/context.js';
import type { TemplateContext } from '../core/types.js';

/**
 * 基础模板 Builder 类
 *
 * 提供链式 API 来构建模板上下文。
 * 这是一个抽象基类，子类需要实现具体的构建逻辑。
 *
 * @remarks
 * 该类提供了丰富的上下文管理功能：
 * - 内置变量的自动初始化
 * - 链式调用的便捷 API
 * - 变量的添加、合并、清空等操作
 *
 * @example
 * ```typescript
 * // 创建自定义 Builder
 * class CustomBuilder extends BaseTemplateBuilder {
 *   build(): string {
 *     return JSON.stringify(this.getContext());
 *   }
 * }
 *
 * // 使用链式 API
 * const result = new CustomBuilder()
 *   .withDate()
 *   .addVariable('name', 'John')
 *   .build();
 * ```
 *
 * @public
 */
export abstract class BaseTemplateBuilder {
    protected contextManager: ContextManager;

    constructor() {
        this.contextManager = new ContextManager();
        this._initBuiltinVariables();
    }

    /**
     * 初始化内置变量
     *
     * 从 BuiltinVariables 获取所有变量，过滤掉 undefined 值，
     * 并设置到 context manager 中。
     *
     * @private
     */
    private _initBuiltinVariables(): void {
        const builtinVars = BuiltinVariables.getAll();
        const filteredVars: Record<string, string | number | boolean> = {};
        Object.entries(builtinVars).forEach(([key, value]) => {
            if (value !== undefined) {
                filteredVars[key] = value;
            }
        });
        this.contextManager.setMany(filteredVars);
    }

    /**
     * 添加当前日期变量
     *
     * @returns 当前实例，支持链式调用
     *
     * @remarks
     * 日期格式为 YYYY-MM-DD。
     * 此方法会覆盖已存在的 date 变量。
     *
     * @example
     * ```typescript
     * const builder = new MyBuilder();
     * builder.withDate();
     * const context = builder.getContext();
     * // context.date: '2024-01-01'
     * ```
     */
    withDate(): this {
        this.contextManager.set('date', BuiltinVariables.getDate());
        return this;
    }

    /**
     * 添加当前时间戳变量
     *
     * @returns 当前实例，支持链式调用
     *
     * @remarks
     * 时间戳为 Unix 时间戳（毫秒）。
     * 此方法会覆盖已存在的 timestamp 变量。
     *
     * @example
     * ```typescript
     * const builder = new MyBuilder();
     * builder.withTimestamp();
     * const context = builder.getContext();
     * // context.timestamp: '1704067200000'
     * ```
     */
    withTimestamp(): this {
        this.contextManager.set('timestamp', BuiltinVariables.getTimestamp());
        return this;
    }

    /**
     * 添加 UUID 变量
     *
     * @returns 当前实例，支持链式调用
     *
     * @remarks
     * 生成 RFC 4122 标准的 UUID 字符串。
     * 每次调用都会生成新的 UUID。
     * 此方法会覆盖已存在的 uuid 变量。
     *
     * @example
     * ```typescript
     * const builder = new MyBuilder();
     * builder.withUUID();
     * const context = builder.getContext();
     * // context.uuid: '550e8400-e29b-41d4-a716-446655440000'
     * ```
     */
    withUUID(): this {
        this.contextManager.set('uuid', BuiltinVariables.getUUID());
        return this;
    }

    /**
     * 添加自定义变量
     *
     * @param key - 变量名，必须是非空字符串
     * @param value - 变量值，支持字符串、数字、布尔值
     *
     * @returns 当前实例，支持链式调用
     *
     * @throws {TypeError} 当 key 不是字符串或为空时抛出
     * @throws {TypeError} 当 value 类型不支持时抛出
     *
     * @example
     * ```typescript
     * const builder = new MyBuilder();
     * builder
     *   .addVariable('name', 'John')
     *   .addVariable('age', 30)
     *   .addVariable('isActive', true);
     * ```
     */
    addVariable(key: string, value: string | number | boolean): this {
        this.contextManager.set(key, value);
        return this;
    }

    /**
     * 批量添加变量
     *
     * @param variables - 包含多个变量的记录对象
     *
     * @returns 当前实例，支持链式调用
     *
     * @throws {TypeError} 当 variables 不是对象时抛出
     *
     * @remarks
     * 此方法会将传入的对象属性合并到上下文中，
     * 相同键名的变量会被新值覆盖。
     *
     * @example
     * ```typescript
     * const builder = new MyBuilder();
     * builder.addVariables({
     *   name: 'John',
     *   age: 30,
     *   city: 'Beijing'
     * });
     * ```
     */
    addVariables(variables: Record<string, string | number | boolean>): this {
        this.contextManager.setMany(variables);
        return this;
    }

    /**
     * 合并另一个上下文
     *
     * @param context - 要合并的上下文对象
     *
     * @returns 当前实例，支持链式调用
     *
     * @throws {TypeError} 当 context 不是有效的 TemplateContext 时抛出
     *
     * @remarks
     * 此方法会将传入的上下文对象属性合并到当前上下文中，
     * 相同键名的变量会被新值覆盖。
     *
     * @example
     * ```typescript
     * const builder1 = new MyBuilder();
     * builder1.addVariable('name', 'John');
     *
     * const builder2 = new MyBuilder();
     * builder2.addVariable('age', 30);
     *
     * builder1.merge(builder2.getContext());
     * const context = builder1.getContext();
     * // context: { name: 'John', age: 30, date: '...', timestamp: '...', uuid: '...' }
     * ```
     */
    merge(context: TemplateContext): this {
        this.contextManager.merge(context);
        return this;
    }

    /**
     * 获取当前上下文
     *
     * @returns 上下文副本，防止外部直接修改内部状态
     *
     * @remarks
     * 返回的是上下文的浅拷贝，确保外部无法直接修改内部状态。
     * 包含所有内置变量和自定义变量。
     *
     * @example
     * ```typescript
     * const builder = new MyBuilder();
     * builder.addVariable('name', 'John');
     *
     * const context = builder.getContext();
     * // context: { name: 'John', date: '...', timestamp: '...', uuid: '...' }
     * ```
     */
    getContext(): TemplateContext {
        return this.contextManager.get();
    }

    /**
     * 清空所有自定义变量（保留内置变量）
     *
     * @returns 当前实例，支持链式调用
     *
     * @remarks
     * 此操作会移除所有自定义变量，但保留内置变量（date、timestamp、uuid）。
     * 内置变量会在清空后重新初始化。
     *
     * @example
     * ```typescript
     * const builder = new MyBuilder();
     * builder
     *   .addVariable('name', 'John')
     *   .clear()
     *   .addVariable('age', 30);
     *
     * const context = builder.getContext();
     * // context: { age: 30, date: '...', timestamp: '...', uuid: '...' }
     * // name 变量已被清除
     * ```
     */
    clear(): this {
        this.contextManager.clear();
        this._initBuiltinVariables();
        return this;
    }

    /**
     * 抽象方法：构建最终结果
     *
     * 子类必须实现此方法来定义具体的构建逻辑。
     *
     * @returns 构建的结果，可以是字符串或其他类型
     *
     * @example
     * ```typescript
     * class FileNamingBuilder extends BaseTemplateBuilder {
     *   build(): string {
     *     const context = this.getContext();
     *     return `${context.date}_${context.filename}`;
     *   }
     * }
     * ```
     */
    abstract build(): string | TemplateContext;
}
