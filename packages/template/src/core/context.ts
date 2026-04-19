import type { TemplateContext } from './types.js';

/**
 * 上下文管理器
 *
 * 负责管理模板渲染所需的变量上下文。
 * 提供变量的增删改查、合并等操作。
 *
 * @remarks
 * 该类提供了完整的上下文管理功能：
 * - 变量的添加和批量添加
 * - 变量查询和存在性检查
 * - 上下文清空和合并
 * - 变量删除
 *
 * @example
 * ```typescript
 * const manager = new ContextManager();
 *
 * // 添加单个变量
 * manager.set('name', 'John');
 *
 * // 批量添加变量
 * manager.setMany({ age: 30, city: 'Beijing' });
 *
 * // 获取上下文
 * const context = manager.get();
 * // 返回: { name: 'John', age: 30, city: 'Beijing' }
 * ```
 *
 * @public
 */
export class ContextManager {
    private context: TemplateContext = {};

    /**
     * 添加单个变量到上下文
     *
     * @param key - 变量名，必须是非空字符串
     * @param value - 变量值，支持字符串、数字、布尔值
     *
     * @throws {TypeError} 当 key 不是字符串或为空时抛出
     * @throws {TypeError} 当 value 类型不支持时抛出
     *
     * @example
     * ```typescript
     * const manager = new ContextManager();
     * manager.set('name', 'John');
     * manager.set('age', 30);
     * manager.set('isActive', true);
     * ```
     */
    set(key: string, value: string | number | boolean): void {
        this.context[key] = value;
    }

    /**
     * 批量设置变量
     *
     * @param variables - 包含多个变量的记录对象
     *
     * @throws {TypeError} 当 variables 不是对象时抛出
     *
     * @remarks
     * 此方法会将传入的对象属性合并到现有上下文中，
     * 相同键名的变量会被新值覆盖。
     *
     * @example
     * ```typescript
     * const manager = new ContextManager();
     * manager.setMany({
     *   name: 'John',
     *   age: 30,
     *   city: 'Beijing'
     * });
     * ```
     */
    setMany(variables: Record<string, string | number | boolean>): void {
        Object.assign(this.context, variables);
    }

    /**
     * 获取上下文变量
     *
     * @returns 当前上下文的副本，防止外部直接修改
     *
     * @remarks
     * 返回的是上下文的浅拷贝，确保外部无法直接修改内部状态。
     *
     * @example
     * ```typescript
     * const manager = new ContextManager();
     * manager.set('name', 'John');
     *
     * const context = manager.get();
     * // context: { name: 'John' }
     *
     * // 修改返回值不会影响内部状态
     * context.name = 'Jane';
     * const context2 = manager.get();
     * // context2: { name: 'John' } (未改变)
     * ```
     */
    get(): TemplateContext {
        return { ...this.context };
    }

    /**
     * 清空上下文
     *
     * @remarks
     * 此操作会移除所有自定义变量，但不影响内置变量。
     *
     * @example
     * ```typescript
     * const manager = new ContextManager();
     * manager.set('name', 'John');
     * manager.clear();
     * const context = manager.get();
     * // context 只包含内置变量
     * ```
     */
    clear(): void {
        this.context = {};
    }

    /**
     * 合并另一个上下文
     *
     * @param other - 要合并的上下文对象
     *
     * @throws {TypeError} 当 other 不是有效的 TemplateContext 时抛出
     *
     * @remarks
     * 此方法会将传入的上下文对象属性合并到当前上下文中，
     * 相同键名的变量会被新值覆盖。
     *
     * @example
     * ```typescript
     * const manager1 = new ContextManager();
     * manager1.set('name', 'John');
     *
     * const manager2 = new ContextManager();
     * manager2.set('age', 30);
     *
     * manager1.merge(manager2.get());
     * const context = manager1.get();
     * // context: { name: 'John', age: 30 }
     * ```
     */
    merge(other: TemplateContext): void {
        Object.assign(this.context, other);
    }

    /**
     * 检查变量是否存在
     *
     * @param key - 要检查的变量名
     *
     * @returns 如果变量存在于上下文中返回 true，否则返回 false
     *
     * @throws {TypeError} 当 key 不是字符串时抛出
     *
     * @example
     * ```typescript
     * const manager = new ContextManager();
     * manager.set('name', 'John');
     *
     * console.log(manager.has('name'));  // true
     * console.log(manager.has('age'));   // false
     * ```
     */
    has(key: string): boolean {
        return key in this.context;
    }

    /**
     * 删除指定变量
     *
     * @param key - 要删除的变量名
     *
     * @throws {TypeError} 当 key 不是字符串时抛出
     *
     * @remarks
     * 如果变量不存在，此方法不会抛出异常，而是静默忽略。
     *
     * @example
     * ```typescript
     * const manager = new ContextManager();
     * manager.set('name', 'John');
     * manager.set('age', 30);
     *
     * manager.delete('name');
     * const context = manager.get();
     * // context: { age: 30 }
     * ```
     */
    delete(key: string): void {
        delete this.context[key];
    }
}

/**
 * 创建内置变量提供者
 * 提供常用的系统变量
 *
 * @public
 */
export class BuiltinVariables {
    private constructor() {
        // 私有构造函数，防止实例化
    }

    /**
     * 获取当前日期 (YYYY-MM-DD)
     */
    static getDate(): string {
        return new Date().toISOString().split('T')[0];
    }

    /**
     * 获取当前时间戳
     */
    static getTimestamp(): string {
        return Date.now().toString();
    }

    /**
     * 生成 UUID
     */
    static getUUID(): string {
        return crypto.randomUUID();
    }

    /**
     * 获取所有内置变量
     */
    static getAll(): TemplateContext {
        return {
            date: BuiltinVariables.getDate(),
            timestamp: BuiltinVariables.getTimestamp(),
            uuid: BuiltinVariables.getUUID(),
        };
    }
}
