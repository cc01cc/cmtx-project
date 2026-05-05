#!/usr/bin/env node
/**
 * 构建产物验证脚本
 *
 * 读取 package.json 中所有声明文件路径（bin, main, module, types, exports），
 * 检查对应的 dist/ 文件是否真实存在。
 *
 * 用法:
 *   node scripts/validate-dist.mjs                    # 扫描所有包
 *   node scripts/validate-dist.mjs packages/cli       # 指定包
 */

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const rootDir = new URL("../", import.meta.url).pathname;

function collectPaths(pkg) {
    const paths = [];

    if (pkg.bin) {
        if (typeof pkg.bin === "string") {
            paths.push(pkg.bin);
        } else {
            for (const value of Object.values(pkg.bin)) {
                paths.push(value);
            }
        }
    }

    if (pkg.main) paths.push(pkg.main);
    if (pkg.module) paths.push(pkg.module);
    if (pkg.types) paths.push(pkg.types);

    if (pkg.exports) {
        const walk = (obj) => {
            if (typeof obj === "string") {
                paths.push(obj);
            } else if (obj && typeof obj === "object") {
                for (const value of Object.values(obj)) {
                    walk(value);
                }
            }
        };
        walk(pkg.exports);
    }

    return paths;
}

async function validatePackage(pkgDir) {
    const pkgPath = join(pkgDir, "package.json");
    let pkg;
    try {
        pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
    } catch {
        return { name: pkgDir, ok: true, errors: [] };
    }

    if (pkg.private === true && !pkg.bin) {
        return { name: pkg.name || pkgDir, ok: true, errors: [] };
    }

    const paths = collectPaths(pkg);
    const errors = [];

    for (const filePath of paths) {
        const absPath = resolve(pkgDir, filePath);
        if (!existsSync(absPath)) {
            errors.push(`Missing: ${filePath}`);
        }
    }

    return { name: pkg.name || pkgDir, ok: errors.length === 0, errors };
}

const target = process.argv[2];

if (target) {
    const result = await validatePackage(resolve(rootDir, target));
    if (!result.ok) {
        for (const err of result.errors) {
            console.error(`[FAIL] ${result.name}: ${err}`);
        }
        process.exit(1);
    }
    console.log(`[OK] ${result.name}`);
} else {
    const { readdir } = await import("node:fs/promises");
    const packagesDir = join(rootDir, "packages");
    const entries = await readdir(packagesDir, { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory()).map((e) => join(packagesDir, e.name));

    const results = await Promise.all(dirs.map(validatePackage));
    let exitCode = 0;

    for (const r of results) {
        if (r.ok) {
            console.log(`[OK] ${r.name}`);
        } else {
            exitCode = 1;
            for (const err of r.errors) {
                console.error(`[FAIL] ${r.name}: ${err}`);
            }
        }
    }

    process.exit(exitCode);
}
