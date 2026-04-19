---
name: versioning-standards
description: 规范处理语义化版本号，支持多生态规则。用于版本比较、升级范围、breaking change 等。
license: MIT
---

# Versioning Standards

规范处理版本号问题，优先依据官方规范，避免“经验化”或混用不同生态规则。

## When to Use This Skill

在以下场景使用本 skill：

- 用户请求解释 SemVer / CalVer / PEP 440
- 用户请求比较两个版本号大小或排序
- 用户请求解释依赖范围（如 `^`, `~`, `>=`, `<`, `~=`, `==`）
- 用户请求判断是否为 breaking change、该 bump major/minor/patch
- 用户请求跨生态版本映射（如 SemVer 到 PEP 440）
- 用户请求核对 Debian / RPM / Maven 的特殊比较规则

不要在“纯业务文案版本命名”且无技术规则诉求时触发本 skill。

## Required Inputs

在回答前尽量确认：

1. 目标生态：npm / Python / Rust / Go / Maven / Debian / RPM / 通用 SemVer
2. 问题类型：解析、比较、排序、范围匹配、升级建议、迁移映射
3. 输入样本：版本字符串或范围表达式
4. 输出深度：简答（结论）或详解（含规则来源）
5. 严谨性要求：是否必须附官方出处

## Workflow

1. 先识别生态。不要跨生态混用规则。
2. 先查 `./references/README.md` 与对应离线文档，优先使用本地规则回答。
3. 本地文档无法覆盖、用户要求官方原文、或存在高争议结论时，再用 `./references/official-versioning-urls.md` 在线 fetch。
4. 给出结果时明确：
    - 采用的规则体系
    - 关键比较点（pre-release、build metadata、epoch、特殊后缀等）
    - 是否存在生态差异风险
5. 若用户要“怎么 bump”，按变更类型输出建议：
    - API 破坏：major
    - 向后兼容新增：minor
    - 向后兼容修复：patch
6. 若是依赖范围问题，给出可执行的范围示例并解释边界。

## Fetch Strategy

当出现以下任一情况时，再 fetch 官方文档（平时优先离线 reference）：

- 用户要求“官方依据”
- 涉及 Debian / RPM / Maven 等非纯 SemVer 规则
- 涉及 pre-release、build metadata、epoch、本地版本标记
- 涉及工具实现细节（npm/node-semver、Cargo、Go pseudo-version）

## Validation and Troubleshooting

交付前检查：

1. 是否明确写出“采用的版本规范”
2. 是否避免把不同生态规则混在一起
3. 是否说明 pre-release / build / epoch 的处理方式
4. 是否在高风险结论处给出官方链接

常见误区：

- 把 SemVer 的 `+build` 当作排序依据（SemVer 中不参与优先级）
- 把 PEP 440 与 SemVer 的 pre-release 写法直接等同
- 把 Maven 排序当作 SemVer 2.0 完全兼容
- 忽略 Debian/RPM 对特殊字符与分段比较的规则

## Output Pattern

建议按以下结构输出：

1. 结论（1-2 句）
2. 规则依据（生态 + 官方来源）
3. 关键比较过程（简要）
4. 可执行建议（范围写法 / bump 策略）

## Activation Test Prompts

- "帮我比较 `1.2.3-alpha.1` 和 `1.2.3`，并给出官方依据。"
- "Python 里 `1!1.0` 和 `2024.12` 怎么排序？"
- "npm 的 `^0.2.3` 到底允许升级到哪？"
