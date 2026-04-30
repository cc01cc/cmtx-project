/**
 * Logger 函数类型
 */
export type Logger = (level: LogLevel, message: string, meta?: unknown) => void;

/**
 * 日志级别
 */
export type LogLevel = "debug" | "info" | "warn" | "error";
