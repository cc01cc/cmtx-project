# Opengrep vs Oxlint 复杂度能力对比分析

> [INFO] 本文档为**纯参考/分析文档**。实现细节和配置方案已迁移至 `plans/PLAN-012-opengrep-oxlint-replacement.md`。

## 概述

本文档记录了 CMTX monorepo 项目中 Opengrep 与 Oxlint 在代码质量检查（特别是复杂度计算）方面的能力对比分析。

**调研日期：** 2026-04-27

**工具背景：**

- Opengrep：Semgrep fork，基于 tree-sitter 模式匹配的 SAST 工具
- Oxlint：Oxc 生态的 Rust linter，ESLint 兼容，50-100x 性能提升
- 对比目的：评估 Oxlint 是否能替代 Opengrep 的复杂度检测和安全扫描功能

---

## Opengrep 当前规则及 Oxlint 等价映射

> Opengrep 是 Semgrep 的一个 fork，使用 tree-sitter 模式匹配引擎进行 SAST 扫描。

| # | Opengrep 规则 | 严重级别 | Oxlint 等价规则 | 来源 | 分类 | 默认启用 |
|---|--------------|---------|----------------|------|------|---------|
| 1 | `no-console-log-in-production` | WARNING | `eslint/no-console` | eslint | restriction | 否 |
| 2 | `no-debugger-statement` | ERROR | `eslint/no-debugger` | eslint | correctness | [OK] 是 |
| 3 | `no-var-use-let-const` | WARNING | `eslint/no-var` | eslint | restriction | 否 |
| 4 | `no-eval` | ERROR | `eslint/no-eval` | eslint | correctness | [OK] 是 |
| 5 | `no-global-eval` | ERROR | `eslint/no-restricted-globals` | eslint | restriction | 否 |
| 6 | `too-many-parameters` (>5) | WARNING | `eslint/max-params` | eslint | style | 否 |

**覆盖率：6/6 规则可找到 Oxlint 等价或配置替代。**

相关规则文档页：

- <https://oxc.rs/docs/guide/usage/linter/rules/eslint/no-console>
- <https://oxc.rs/docs/guide/usage/linter/rules/eslint/no-debugger>
- <https://oxc.rs/docs/guide/usage/linter/rules/eslint/no-var>
- <https://oxc.rs/docs/guide/usage/linter/rules/eslint/no-eval>
- <https://oxc.rs/docs/guide/usage/linter/rules/eslint/no-restricted-globals>
- <https://oxc.rs/docs/guide/usage/linter/rules/eslint/max-params>

---

## 复杂度规则全景对比（核心部分）

### Opengrep 的复杂度检测

当前 `.opengrep.yml` 中仅有一条复杂度相关规则：

- `too-many-parameters`：函数参数超过 5 个时告警

### Oxlint 内置复杂度规则全集

Oxlint 从 ESLint 核心规则中移植了大量复杂度度量规则，以下是完整清单：

| # | 规则 | 分类 | 度量维度 | 默认阈值 | 可配置项 |
|---|------|------|----------|----------|---------|
| 1 | `eslint/complexity` | restriction | **圈复杂度** (McCabe) | max=20 | max, variant (classic/modified) |
| 2 | `eslint/max-params` | style | 函数参数个数 | max=3 | max |
| 3 | `eslint/max-depth` | pedantic | 代码块嵌套深度 | max=4 | max |
| 4 | `eslint/max-lines` | pedantic | 每文件行数 | max=300 | max, skipBlankLines, skipComments |
| 5 | `eslint/max-lines-per-function` | pedantic | 每函数行数 | max=50 | max, IIFEs, skipBlankLines, skipComments |
| 6 | `eslint/max-statements` | style | 每函数语句数 | max=10 | max, ignoreTopLevelFunctions |
| 7 | `eslint/max-nested-callbacks` | pedantic | 回调函数嵌套深度 | max=10 | max |
| 8 | `eslint/max-classes-per-file` | -- | 每文件类数 | -- | max |
| 9 | `eslint/id-length` | style | 标识符长度 | -- | min, max, exceptions |

### 圈复杂度 (Cyclomatic Complexity)

`eslint/complexity` 是 Oxlint 的复杂度计算核心，基于 **McCabe 圈复杂度**算法——计算函数中线性无关路径的数量（每个分支/循环 +1）。

**支持两种计算变体：**

| 变体 | 说明 |
|------|------|
| `classic` | 标准 McCabe 算法，每个 if/for/while/&&/\|\|/\?\?/?./||= 等均 +1 |
| `modified` | 与 classic 相同，但 switch 语句整体算 +1（不限 case 数量） |

配置示例：

```json
{
    "rules": {
        "complexity": ["error", { "max": 15, "variant": "modified" }]
    }
}
```

相关文档：<https://oxc.rs/docs/guide/usage/linter/rules/eslint/complexity>

### 认知复杂度 (Cognitive Complexity)

**认知复杂度**（SonarSource S3776）是一种比 McCabe 更现代的度量标准，它区分"容易理解的分支"和"增加认知负担的结构"（如嵌套条件、递归等）。

**Oxlint 内置不支持认知复杂度。** 但可通过 `jsPlugins` 机制（alpha 阶段）加载外部 SonarJS 插件：

```json
{
    "jsPlugins": ["@eslint-sonarjs/eslint-plugin-sonarjs"],
    "rules": {
        "sonarjs/cognitive-complexity": ["error", 15]
    }
}
```

> [WARN] `jsPlugins` 仍处于 alpha 阶段，不保证稳定性。

SonarJS 359/360 条规则已在 Oxlint conformance 测试中完全通过：
<https://github.com/oxc-project/oxc/blob/main/apps/oxlint/conformance/snapshots/sonarjs.md>

### 对比总结

```
Opengrep 复杂度检测 (1 条)
  L-- too-many-parameters (>5)               参数个数

Oxlint 复杂度检测 (9+ 条)
  L-- complexity (圈复杂度)                  分支/路径复杂度
  L-- max-params (参数个数)                  替代 opengrep
  L-- max-depth (嵌套深度)                   无 opengrep 对应
  L-- max-lines (文件行数)                   无 opengrep 对应
  L-- max-lines-per-function (函数行数)       无 opengrep 对应
  L-- max-statements (函数语句数)            无 opengrep 对应
  L-- max-nested-callbacks (回调嵌套深度)     无 opengrep 对应
  L-- max-classes-per-file (类数)            无 opengrep 对应
  L-- id-length (标识符长度)                 无 opengrep 对应
```

**Oxlint 在复杂度度量的广度上远超 Opengrep。**

> 实现方案见 `plans/PLAN-012-opengrep-oxlint-replacement.md`。

---

## Oxlint 内置安全/正确性规则补充

以下规则是 Opengrep 当前 6 条规则未覆盖、但 Oxlint 内置的安全或正确性检测：

| 规则 | 来源 | 说明 | 默认启用 |
|------|------|------|---------|
| `eslint/no-implied-eval` / `typescript/no-implied-eval` | typescript | 禁止 setTimeout/setInterval 字符串参数、`new Function()` | [OK] (type-aware) |
| `eslint/no-new-func` | eslint | 禁止 `new Function()` | 否 |
| `eslint/no-script-url` | eslint | 禁止 `javascript:` URL | 否 |
| `eslint/no-alert` | eslint | 禁止 alert/confirm/prompt | 否 |
| `eslint/no-caller` | eslint | 禁止 arguments.caller/callee | [OK] 是 |
| `eslint/no-proto` | eslint | 禁止 `__proto__` | 否 |
| `eslint/no-extend-native` | eslint | 禁止扩展原生原型 | 否 |
| `unicorn/no-document-cookie` | unicorn | 禁止 document.cookie | 否 |

相关文档：

- <https://oxc.rs/docs/guide/usage/linter/rules/typescript/no-implied-eval>
- <https://oxc.rs/docs/guide/usage/linter/rules/eslint/no-new-func>
- <https://oxc.rs/docs/guide/usage/linter/rules/eslint/no-script-url>
- <https://oxc.rs/docs/guide/usage/linter/rules/eslint/no-alert>

---

## 注意事项

Oxlint 配置中 `plugins` 字段**覆盖默认插件集**（含 `eslint`, `typescript`, `unicorn`, `oxc`）。启用 Oxlint 替代 Opengrep 时必须显式声明 `"eslint"` 插件，否则表格中所有 `eslint/*` 规则不会生效。

> 来源：<https://oxc.rs/docs/guide/usage/linter/config-file-reference>

---

## Oxlint 无法完全覆盖 Opengrep 的地方

### 1. 自定义 AST 模式匹配

Opengrep / Semgrep 的核心优势是**任意 AST 模式匹配**能力，支持用类似代码的形式书写自定义检测规则。例如：

```yaml
# Opengrep: 检测特定 API 的错误使用模式
- id: detect-unsafe-api-call
  patterns:
    - pattern: |
        $CTX.$METHOD($ARG, { unsafe: true })
  message: "不应使用 unsafe 模式"
  languages: [typescript]
  severity: ERROR
```

**Oxlint 不支持此功能。** 其检测能力受限于 721 条内置规则。

### 2. 跨文件 / 多文件数据流分析

Opengrep 支持跨文件的污点追踪（taint tracking），Oxlint 仅支持单文件分析。

### 3. 生态成熟度差异

| 维度 | Opengrep | Oxlint |
|------|----------|--------|
| 规则数量 | 不限（可自定义） | 721 条内置规则 |
| 自定义规则 | 支持（YAML/JSON pattern） | 不支持内置，`jsPlugins` alpha |
| 社区规则库 | Semgrep Registry (2000+ 规则) | 无 |
| 性能 | 较慢（Python 实现） | 极快（Rust 实现，50-100x） |
| 类型感知 | 弱 | 强（TypeScript type-aware lint） |
| 自动修复 | 有限 | 262+ 条规则支持 auto-fix |

---

## 参考资料

- Opengrep GitHub: <https://github.com/opengrep/opengrep>
- Oxlint 官方文档: <https://oxc.rs/docs/guide/usage/linter>
- Oxlint 完整规则列表: <https://oxc.rs/docs/guide/usage/linter/rules>
- Oxlint 配置文件参考: <https://oxc.rs/docs/guide/usage/linter/config-file-reference>
- Oxlint CLI 参考: <https://oxc.rs/docs/guide/usage/linter/cli>
- Oxlint 插件一览: <https://oxc.rs/docs/guide/usage/linter#built-in-plugins>
- Oxc 基准测试: <https://oxc.rs/docs/guide/benchmarks>
- Oxc LLM 优化文档: <https://oxc.rs/llms.txt>
- Oxlint SonarJS Conformance: <https://github.com/oxc-project/oxc/blob/main/apps/oxlint/conformance/snapshots/sonarjs.md>
- Oxc 项目 GitHub: <https://github.com/oxc-project/oxc>
- McCabe 圈复杂度 (Wikipedia): <https://en.wikipedia.org/wiki/Cyclomatic_complexity>
- Skill: Oxc 官方文档（本地）: `.kilo/skills-repo/develop/oxc-official-docs/SKILL.md`
- Skill: 文档命名规范（本地）: `.kilo/skills-repo/shared/document-naming-convention/SKILL.md`

**实现相关**:

- 替代实施方案: `plans/PLAN-012-opengrep-oxlint-replacement.md`
- 同系列迁移参考: `internal/plans/PLAN-011-replace-biome-with-oxlint.md`
