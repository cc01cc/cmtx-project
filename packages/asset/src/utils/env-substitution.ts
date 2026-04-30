/**
 * 环境变量替换工具
 *
 * @module utils/env-substitution
 * @description
 * 支持 ${ENV_VAR} 和 ${ENV_VAR:-default} 语法的环境变量替换。
 */

/**
 * 环境变量解析器函数类型
 */
export type EnvResolver = (name: string) => string | undefined;

/**
 * 在字符串中替换环境变量
 * 支持 ${ENV_VAR} 和 ${ENV_VAR:-default} 语法
 *
 * @param value - 要处理的字符串
 * @param resolver - 自定义环境变量解析器（可选，默认使用 process.env）
 * @returns 替换后的字符串
 */
export function substituteEnvVars(value: string, resolver?: EnvResolver): string {
    // Match ${VAR} or ${VAR:-default}
    const regex = /\$\{([^}]+)\}/g;

    return value.replace(regex, (_match, content) => {
        // Check if there's a default value
        const colonIndex = content.indexOf(":-");
        const varName = colonIndex >= 0 ? content.slice(0, colonIndex) : content;
        const defaultValue = colonIndex >= 0 ? content.slice(colonIndex + 2) : "";

        const envValue = resolver ? resolver(varName) : process.env[varName];
        return envValue !== undefined ? envValue : defaultValue;
    });
}

/**
 * 在对象中递归替换环境变量
 *
 * @param obj - 要处理的对象
 * @param resolver - 自定义环境变量解析器（可选，默认使用 process.env）
 * @returns 替换后的对象
 */
export function substituteEnvVarsInObject<T>(obj: T, resolver?: EnvResolver): T {
    if (typeof obj === "string") {
        return substituteEnvVars(obj, resolver) as unknown as T;
    }

    if (Array.isArray(obj)) {
        return obj.map((item) => substituteEnvVarsInObject(item, resolver)) as unknown as T;
    }

    if (obj !== null && typeof obj === "object") {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
            result[key] = substituteEnvVarsInObject(value, resolver);
        }
        return result as unknown as T;
    }

    return obj;
}
