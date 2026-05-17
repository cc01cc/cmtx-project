import { isAbsolute, resolve } from "node:path";

export function resolveBaseDirectory(
    configBaseDir: string | undefined,
    appDefaultDir: string,
): string {
    if (!configBaseDir) {
        return appDefaultDir;
    }
    if (isAbsolute(configBaseDir)) {
        return resolve(configBaseDir);
    }
    return resolve(appDefaultDir, configBaseDir);
}
