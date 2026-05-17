#!/usr/bin/env node
/**
 * check-api-docs-sync.mjs
 * 检查代码中的 public export 与 docs/api/*.md 手写文档是否同步。
 *
 * 检查维度:
 *   1. 名称同步 — 代码中的 public export 在文档中是否收录（MISSING / STALE）
 *   2. 参数签名 — 文档中函数声明的参数名是否与代码一致（SIGNATURE）
 *
 * 用法:
 *   node scripts/check-api-docs-sync.mjs
 *   node scripts/check-api-docs-sync.mjs core     # 仅检查 @cmtx/core
 *
 * 报告:
 *   [MISSING]  代码中有但文档中未找到 → 新增未同步
 *   [STALE]    文档中有但代码中已不存在 → 已删除未清理
 *   [SIGNATURE] 文档中的函数参数名与代码不一致 → 文档过期
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const API_DIR = join(ROOT, "docs/i18n/zh-Hans/api");

// ── 包定义: 目录名 → { scope, indexPaths, docFiles } ──────────────
const PKGS = {
    core: {
        scope: "@cmtx/core",
        docFiles: ["core-image.md", "core-metadata.md", "core-utils.md"],
    },
    asset: {
        scope: "@cmtx/asset",
        docFiles: ["asset-services.md", "asset-config.md"],
    },
    storage: {
        scope: "@cmtx/storage",
        docFiles: ["storage.md", "storage-adapters.md"],
    },
    template: { scope: "@cmtx/template", docFiles: ["template.md"] },
    "rule-engine": {
        scope: "@cmtx/rule-engine",
        docFiles: ["rule-engine-core.md", "rule-engine-rules.md"],
    },
    ai: { scope: "@cmtx/ai", docFiles: ["ai.md"] },
    "fpe-wasm": { scope: "@cmtx/fpe-wasm", docFiles: ["fpe-wasm.md"] },
    "autocorrect-wasm": {
        scope: "@cmtx/autocorrect-wasm",
        docFiles: ["autocorrect-wasm.md"],
    },
    "markdown-it-presigned-url": {
        scope: "@cmtx/markdown-it-presigned-url",
        docFiles: ["markdown-it-plugins.md"],
    },
    "markdown-it-presigned-url-adapter-nodejs": {
        scope: "@cmtx/markdown-it-presigned-url-adapter-nodejs",
        docFiles: ["markdown-it-plugins.md"],
    },
};

const targetPkg = process.argv[2];

// ════════════════════════════════════════════════════════════════════
// Step 1: 从 index.ts 提取 export 名称
// ════════════════════════════════════════════════════════════════════

function extractExports(filePath) {
    if (!existsSync(filePath)) return new Map(); // name → sourcePath
    const content = readFileSync(filePath, "utf-8");
    const exports = new Map();

    // export function Foo, export class Bar, export async function Baz, etc.
    for (const m of content.matchAll(
        /^export\s+(?:default\s+)?(?:async\s+)?(?:function|class|interface|type|enum|const)\s+(\w+)/gm,
    )) {
        exports.set(m[1], filePath);
    }

    // export { Foo, Bar as Baz }
    for (const m of content.matchAll(/export\s+(?:type\s+)?\{\s*([^}]+)\}/g)) {
        for (const item of m[1].matchAll(/\b(\w+)\b/g)) {
            const name = item[1];
            if (name !== "type" && name !== "as") exports.set(name, filePath);
        }
    }

    // export { Foo } from "./bar.js" — 跟踪 re-export 链
    for (const m of content.matchAll(
        /export\s+(?:\w+\s+)?\{\s*([^}]+)\}\s*from\s+["']\.\/([^"']+)["']/g,
    )) {
        const sourceModule = m[2].replace(/\.\w+$/, ""); // strip .js/.ts extension
        for (const item of m[1].matchAll(/\b(\w+)\b/g)) {
            const name = item[1];
            if (name !== "type" && name !== "as") {
                const sourcePath = resolve(dirname(filePath), `${sourceModule}.ts`);
                exports.set(name, existsSync(sourcePath) ? sourcePath : filePath);
            }
        }
    }

    return exports;
}

function collectPkgExports(pkgDir) {
    const pkgPath = join(ROOT, "packages", pkgDir);
    if (!existsSync(pkgPath)) return new Map();

    const allExports = new Map(); // name → sourceFilePath

    // 1. 主 barrel: src/index.ts
    const mainIndex = join(pkgPath, "src/index.ts");
    for (const [name, src] of extractExports(mainIndex)) {
        allExports.set(name, src);
    }

    // 2. 子路径导出: 读取 package.json exports 字段
    //    检测 exports 中形如 "./adapters/xxx": { ... } 的条目，
    //    找到对应的 src/adapters/xxx/index.ts 提取导出
    const pkgJsonPath = join(pkgPath, "package.json");
    if (existsSync(pkgJsonPath)) {
        try {
            const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));
            const exports = pkgJson.exports;
            if (exports && typeof exports === "object") {
                for (const [subpath, _cfg] of Object.entries(exports)) {
                    // 跳过主入口 "."，只处理子路径如 "./adapters/ali-oss"
                    if (subpath === "." || subpath.startsWith("./internal")) continue;
                    const subRel = subpath.replace(/^\.\//, "");
                    // 尝试两种源文件位置: src/xxx/index.ts 或 src/xxx.ts
                    let subIndex = join(pkgPath, "src", subRel, "index.ts");
                    if (!existsSync(subIndex)) {
                        subIndex = join(pkgPath, "src", subRel + ".ts");
                    }
                    if (existsSync(subIndex)) {
                        for (const [name, src] of extractExports(subIndex)) {
                            allExports.set(name, src);
                        }
                    }
                }
            }
        } catch {
            // package.json 解析失败则静默跳过
        }
    }

    return allExports;
}

// ════════════════════════════════════════════════════════════════════
// Step 2: 从代码中提取函数签名（参数名列表）
// ════════════════════════════════════════════════════════════════════

/**
 * 从源码文件中提取指定函数的参数名列表。
 * 解析 function foo(param1, param2?) 形式的签名。
 */
function extractCodeParams(sourceFile, funcName) {
    if (!existsSync(sourceFile)) return null;
    const content = readFileSync(sourceFile, "utf-8");

    // 匹配: export function Foo(params): RetType
    //       export async function Foo(params): Promise<RetType>
    const funcMatch = content.match(
        new RegExp(`(?:export\\s+)?(?:async\\s+)?function\\s+${funcName}\\s*\\(([^)]*)\\)`),
    );
    if (!funcMatch) return null;

    const paramsStr = funcMatch[1];
    return parseParams(paramsStr);
}

/**
 * 解析参数字符串为参数名数组。
 * "(a: string, b?: number, c)" → ["a", "b", "c"]
 */
function parseParams(paramsStr) {
    if (!paramsStr || paramsStr.trim() === "") return [];
    const names = [];
    // 按逗号分割，但要注意泛型中的逗号（如 Promise<void> 不含逗号，简单场景忽略嵌套）
    let depth = 0;
    let current = "";
    for (const ch of paramsStr) {
        if (ch === "," && depth === 0) {
            const trimmed = current.trim();
            const name = trimmed.split(":")[0].split("=")[0].trim().replace(/\?$/, "");
            if (name && name !== "...") names.push(name);
            current = "";
        } else {
            if (ch === "<" || ch === "{" || ch === "(") depth++;
            if (ch === ">" || ch === "}" || ch === ")") depth--;
            current += ch;
        }
    }
    const trimmed = current.trim();
    const name = trimmed.split(":")[0].split("=")[0].trim().replace(/\?$/, "");
    if (name) names.push(name);
    return names;
}

// ════════════════════════════════════════════════════════════════════
// Step 3: 从 API 文档提取函数签名（参数名列表）
// ════════════════════════════════════════════════════════════════════

/**
 * 从文档 code block 中提取函数签名参数名。
 * 查找 'function Foo(' 模式。
 */
function extractDocParams(docFiles, funcName) {
    for (const file of docFiles) {
        const fp = join(API_DIR, file);
        if (!existsSync(fp)) continue;
        const content = readFileSync(fp, "utf-8");

        // 查找包含该函数名的 ```ts/typescript 代码块
        const codeBlocks = content.matchAll(/```(?:ts|typescript)\n([\s\S]*?)```/g);
        for (const block of codeBlocks) {
            const code = block[1];
            const funcMatch = code.match(
                new RegExp(`(?:export\\s+)?(?:async\\s+)?function\\s+${funcName}\\s*\\(([^)]*)\\)`),
            );
            if (!funcMatch) continue;

            return parseParams(funcMatch[1]);
        }
    }
    return null;
}

// ════════════════════════════════════════════════════════════════════
// Step 4: 从文档提取 API 名称（已有逻辑）
// ════════════════════════════════════════════════════════════════════

function extractDocApis(docFiles) {
    const names = new Set();
    for (const file of docFiles) {
        const fp = join(API_DIR, file);
        if (!existsSync(fp)) continue;
        const content = readFileSync(fp, "utf-8");

        // H3 标题
        for (const m of content.matchAll(/^###\s+`?(\w+)`?\s*$/gm)) {
            names.add(m[1]);
        }

        // 代码块中的 function/class/interface 声明
        const codeBlocks = content.matchAll(/```(?:ts|typescript)\n([\s\S]*?)```/g);
        for (const block of codeBlocks) {
            for (const sig of block[1].matchAll(
                /^(?:export\s+)?(?:function|class|interface|type|enum|const)\s+(\w+)/gm,
            )) {
                names.add(sig[1]);
            }
        }
    }
    return names;
}

// ════════════════════════════════════════════════════════════════════
// Main
// ════════════════════════════════════════════════════════════════════

let hasIssue = false;

function isLikelyApiName(name) {
    if (name.length <= 2) return false;
    if (/^[a-z]+$/.test(name) && name.length <= 5) return false;
    return true;
}

for (const [pkgDir, cfg] of Object.entries(PKGS)) {
    if (targetPkg && pkgDir !== targetPkg) continue;

    const codeApis = collectPkgExports(pkgDir);
    if (codeApis.size === 0) continue;

    const docApis = extractDocApis(cfg.docFiles);
    const pkgLabel = cfg.scope;

    // ── 1. MISSING ──
    for (const [name, srcFile] of [...codeApis.entries()].sort()) {
        if (!isLikelyApiName(name)) continue;
        if (!docApis.has(name)) {
            console.log(`[MISSING] ${pkgLabel}: ${name} — 代码中存在但 API 文档未收录`);
            hasIssue = true;
        }
    }

    // ── 2. STALE ──
    const docH3 = new Set();
    for (const file of cfg.docFiles) {
        const fp = join(API_DIR, file);
        if (!existsSync(fp)) continue;
        for (const m of readFileSync(fp, "utf-8").matchAll(/^###\s+`?(\w+)`?\s*$/gm)) {
            if (isLikelyApiName(m[1])) docH3.add(m[1]);
        }
    }
    for (const name of [...docH3].sort()) {
        if (!codeApis.has(name)) {
            console.log(`[STALE]  ${pkgLabel}: ${name} — API 文档中存在但代码中已删除`);
            hasIssue = true;
        }
    }

    // ── 3. SIGNATURE 参数签名检查 ──
    for (const [name, srcFile] of [...codeApis.entries()].sort()) {
        if (!isLikelyApiName(name)) continue;

        const codeParams = extractCodeParams(srcFile, name);
        if (!codeParams) continue; // 非函数（type/class/const）跳过

        const docParams = extractDocParams(cfg.docFiles, name);
        if (!docParams) continue; // 文档中无函数签名

        // 比较参数个数
        if (codeParams.length !== docParams.length) {
            console.log(
                `[SIGNATURE] ${pkgLabel}: ${name} — 参数个数不一致 (代码: ${codeParams.length}, 文档: ${docParams.length})`,
            );
            console.log(`    代码: ${codeParams.join(", ")}`);
            console.log(`    文档: ${docParams.join(", ")}`);
            hasIssue = true;
            continue;
        }

        // 比较参数名
        for (let i = 0; i < codeParams.length; i++) {
            if (codeParams[i] !== docParams[i]) {
                console.log(
                    `[SIGNATURE] ${pkgLabel}: ${name} — 参数 #${i + 1} 名不一致 (代码: "${codeParams[i]}", 文档: "${docParams[i]}")`,
                );
                hasIssue = true;
            }
        }
    }
}

if (!hasIssue) {
    console.log("[OK] 所有检查的包 API 文档与代码同步");
}

// ── 已知局限提示 ─────────────────────────────────────────────
const SHARED_DOC_PKGS = [["markdown-it-presigned-url", "markdown-it-presigned-url-adapter-nodejs"]];
const hasSharedDoc = SHARED_DOC_PKGS.some(
    (group) => group.includes(targetPkg || "") || (!targetPkg && group.some((p) => PKGS[p])),
);
if (hasSharedDoc || !targetPkg) {
    console.log("");
    console.log("---");
    console.log("已知局限（可能导致误报）：");
    console.log("  1. [STALE] 多包共享同一文档文件时（如 markdown-it-presigned-url + adapter");
    console.log("     共用 markdown-it-plugins.md），某包的 STALE 可能是另一包的公开 API。");
    console.log("  2. [MISSING] 类型/常量在文档中以表格形式内联呈现（非 H3 节），");
    console.log("     脚本只查 H3 标题和代码块声明，会漏检表格中的条目。");
    console.log("  3. [STALE] 子路径导出的符号如 AliOSSAdapter 已从主 barrel 移除，");
    console.log("     但仍在 @cmtx/storage/adapters/ali-oss 子路径下可用。");
    console.log("     脚本标记 STALE 是因为主 barrel 中不存在，但文档可能正确。");
    console.log("     排查时先确认该符号是否仍在子路径导出。");
}

process.exit(hasIssue ? 1 : 0);
