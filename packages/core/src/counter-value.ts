/**
 * 计数器值配置
 * @public
 */
export interface CounterValueConfig {
    /** 输出字符串长度（默认 6） */
    length?: number;
    /** 进制（默认 36，最大值 36） */
    radix?: number;
}

/**
 * 生成计数器值
 *
 * 将数字转换为指定进制的字符串，并补零到指定长度。
 * 默认使用 36 进制（0-9A-Z），补零到 6 位。
 *
 * @param value - 计数器数值
 * @param config - 可选的配置
 * @returns 格式化的计数器字符串
 *
 * @example
 * ```typescript
 * generateCounterValue(0)     // "000000"
 * generateCounterValue(1)     // "000001"
 * generateCounterValue(35)    // "00000Z"
 * generateCounterValue(46656) // "010000"
 * ```
 * @public
 */
export function generateCounterValue(value: number, config?: CounterValueConfig): string {
    const { length = 6, radix = 36 } = config ?? {};
    return value.toString(radix).toUpperCase().padStart(length, "0");
}
