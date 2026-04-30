/**
 * Logger Module
 *
 * @module logger
 * @description
 * 提供统一的日志记录接口（Logger interface）和默认的 no-op 实现（dummyLogger）。
 *
 * @remarks
 * 本模块**只定义接口**，不包含任何第三方日志库依赖。
 * 具体的日志输出实现由应用层（如 @cmtx/cli）负责。
 *
 * ## 核心功能
 *
 * ### 日志级别
 * - `debug` - 调试信息
 * - `info` - 一般信息
 * - `warn` - 警告信息
 * - `error` - 错误信息
 *
 * ### 使用方式
 *
 * 库包中的类/函数通过可选参数接受 Logger，默认使用 dummyLogger（静默）：
 *
 * ```typescript
 * import { type Logger, dummyLogger } from '@cmtx/core';
 *
 * class MyService {
 *   constructor(private logger: Logger = dummyLogger) {}
 *
 *   doWork() {
 *     this.logger.info('work started');
 *   }
 * }
 * ```
 *
 * 应用层传入自己的实现：
 *
 * ```typescript
 * // 直接使用 console（形状兼容）
 * const service = new MyService(console);
 *
 * // 使用 winston
 * const service = new MyService(winston.createLogger({ ... }));
 * ```
 *
 * @see {@link dummyLogger} - no-op 默认实现
 * @see {@link consoleLogger} - 基于 console 的简易实现（供测试用）
 *
 * @public
 */

/**
 * 日志记录器接口
 *
 * @remarks
 * 定义统一的日志记录方法，覆盖常用的 4 个日志级别。
 * 方法与 console 形状一致，console 本身就是有效的 Logger 实现。
 *
 * @example
 * ```typescript
 * const logger: Logger = {
 *   debug: (msg, ...args) => console.debug(msg, ...args),
 *   info: (msg, ...args) => console.log(msg, ...args),
 *   warn: (msg, ...args) => console.warn(msg, ...args),
 *   error: (msg, ...args) => console.error(msg, ...args),
 * };
 * ```
 *
 * @public
 */
export interface Logger {
    debug(message: string, ...args: unknown[]): void;
    info(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
}

/**
 * No-op 日志记录器
 *
 * @remarks
 * 所有方法均为空函数体，调用时不产生任何输出。
 * 作为库包构造函数/函数参数的默认值使用。
 *
 * @example
 * ```typescript
 * class MyService {
 *   constructor(private logger: Logger = dummyLogger) {}
 * }
 * ```
 *
 * @public
 */
export const dummyLogger: Logger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
};

/**
 * 基于 console 的日志记录器
 *
 * @remarks
 * 简易实现，将日志直接输出到控制台。
 * 适合快速测试或简单场景使用。
 *
 * @example
 * ```typescript
 * const service = new MyService(consoleLogger);
 * ```
 *
 * @public
 */
export const consoleLogger: Logger = {
    // eslint-disable-next-line no-console
    debug: (message, ...args) => console.debug(message, ...args),
    // eslint-disable-next-line no-console
    info: (message, ...args) => console.log(message, ...args),
    // eslint-disable-next-line no-console
    warn: (message, ...args) => console.warn(message, ...args),
    // eslint-disable-next-line no-console
    error: (message, ...args) => console.error(message, ...args),
};
