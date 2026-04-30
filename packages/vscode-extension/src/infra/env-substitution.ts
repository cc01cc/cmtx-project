/**
 * Substitute environment variables in a string
 * Supports ${ENV_VAR} and ${ENV_VAR:-default} syntax
 */
export function substituteEnvVars(value: string): string {
    // Match ${VAR} or ${VAR:-default}
    const regex = /\$\{([^}]+)\}/g;

    return value.replace(regex, (_match, content) => {
        // Check if there's a default value
        const colonIndex = content.indexOf(":-");
        const varName = colonIndex >= 0 ? content.slice(0, colonIndex) : content;
        const defaultValue = colonIndex >= 0 ? content.slice(colonIndex + 2) : "";

        const envValue = process.env[varName];
        return envValue !== undefined ? envValue : defaultValue;
    });
}

/**
 * Recursively substitute environment variables in an object
 */
export function substituteEnvVarsInObject<T>(obj: T): T {
    if (typeof obj === "string") {
        return substituteEnvVars(obj) as unknown as T;
    }

    if (Array.isArray(obj)) {
        return obj.map((item) => substituteEnvVarsInObject(item)) as unknown as T;
    }

    if (obj !== null && typeof obj === "object") {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
            result[key] = substituteEnvVarsInObject(value);
        }
        return result as unknown as T;
    }

    return obj;
}
