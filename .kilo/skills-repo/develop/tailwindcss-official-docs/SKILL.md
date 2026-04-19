---
name: tailwindcss-official-docs
description: 处理 Tailwind 相关问题时查阅官方文档。用于安装、配置、主题定制、性能优化等场景。
license: MIT
metadata:
    category: frontend
    references:
        - https://tailwindcss.com/docs
        - https://tailwindcss.com/docs/installation/using-vite
        - ./references/official-docs-policy.md
---

在处理 TailwindCSS 相关任务时，先基于官方文档确认版本、能力和限制，再输出代码、配置和优化建议。

## When to Use This Skill

在以下场景使用本 skill：

- 用户要求安装或初始化 TailwindCSS（尤其是 Vite 工程）
- 用户要求配置主题、色板、字体、间距、断点、暗色模式
- 用户需要解释或使用 `@theme`、`@source`、`@utility`、`@variant`、`@apply` 等能力
- 用户出现“类名不生效”“样式未生成”“生产环境样式丢失”等问题
- 用户提到 v3 到 v4 迁移，或需要确认某功能在当前版本是否可用
- 用户希望总结 Tailwind 开发最佳实践、提效技巧或团队规范

## Required Inputs

开始前尽量确认以下信息：

1. 项目技术栈与构建工具（Vite、Next.js、Nuxt、Laravel 等）。
2. 当前 Tailwind 版本（或是否正在迁移版本）。
3. 任务类型：安装、配置、开发、排障、迁移、性能优化。
4. 输出偏好：要示例代码、检查清单、还是完整改造步骤。

如果缺失关键信息且会影响结论，先提最少量澄清问题；否则先查官方文档再回问细节。

## Core Rule

涉及 TailwindCSS 事实性结论时，默认执行以下约束：

1. 必须优先查 Tailwind 官方文档，再输出关键判断。
2. 涉及安装、指令、扫描规则、兼容性时，必须确认当前文档是否针对目标版本。
3. 第三方文章、模板仓库、历史教程若与官方冲突，以官方文档为准。
4. 无法确认的内容要明确标注不确定性，禁止把经验猜测写成事实。
5. 输出中应标明依据的官方页面主题，便于复核。

详细策略见 [official-docs-policy.md](./references/official-docs-policy.md)。

## Workflow

### Step 1. 识别需求类型

先判断请求属于哪类：

- 安装与初始化
- 设计令牌与主题扩展
- 组件开发与样式组织
- 扫描规则与类名生成
- 版本迁移与兼容处理
- 构建体积与性能优化
- 故障排查

### Step 2. 锁定官方文档入口

至少优先检查：

1. 文档主页：<https://tailwindcss.com/docs>
2. 安装页：<https://tailwindcss.com/docs/installation/using-vite>
3. 扫描规则页：Detecting classes in source files
4. 指令与函数页：Functions and directives
5. 目标功能对应页面（dark mode、theme、plugins、upgrade guide 等）

### Step 3. 抽取可执行事实

优先提取：

- 当前版本推荐安装方式
- 对应构建工具的官方集成步骤
- 类名检测规则与动态类名限制
- 主题定制、插件、兼容能力边界
- 迁移注意点与已弃用能力

### Step 4. 生成回答

回答结构建议：

1. 结论：先给最短可行路径。
2. 步骤：按官方文档顺序给最小可运行方案。
3. 代码：给与用户栈匹配的示例。
4. 风险：列出版本差异、常见误区与验证方法。

当用户要求“快速掌握 Tailwind”时，优先给：

- 最小安装路径
- 高频实战模式（布局、状态、响应式、主题）
- 最常见故障定位清单
- 推荐学习路线（从官方文档章节映射到任务）

### Step 5. 冲突与不确定性处理

遇到以下情况必须显式说明：

- 官方文档与旧教程冲突
- 示例依赖旧版本配置方式
- 目标框架文档与通用文档细节不一致
- 项目中存在多份样式入口导致扫描范围混乱

此时先给已确认事实，再列待确认项，不要直接下最终断言。

## Fast Mastery Playbook

当用户目标是“快速掌握 Tailwind 开发”时，执行以下紧凑路线：

1. 30 分钟：完成官方安装与首屏样式可见。
2. 30 分钟：掌握断点、状态、暗色模式、伪类组合。
3. 30 分钟：掌握主题令牌与复用模式（组件层与工具类层）。
4. 30 分钟：完成一次排障演练（类名丢失、动态类名、扫描路径）。

输出建议附带“练习任务 + 验收标准”，帮助用户建立稳定心智模型。

## Validation Checklist

输出前自检：

- 是否先基于 Tailwind 官方文档建立结论
- 是否明确版本前提与构建工具前提
- 是否避免把旧版写法当成通用标准
- 是否区分“官方事实”与“工程经验建议”
- 是否给出可验证的最小示例或检查步骤

## Troubleshooting

| Problem              | Likely Cause               | Fix                                |
| -------------------- | -------------------------- | ---------------------------------- |
| 类名写了但没生效     | 类名动态拼接，无法静态检测 | 改为可静态检测的完整类名映射       |
| 本地生效，构建后丢失 | 扫描源未覆盖到模板文件     | 按官方扫描规则补充 source 检测范围 |
| 升级后配置失效       | 混用了旧版本配置方式       | 按目标版本文档重建最小配置         |
| 组件内 `@apply` 异常 | 引用上下文缺失             | 使用官方推荐的 `@reference` 方式   |
| monorepo 下样式异常  | 扫描基路径与执行目录不一致 | 使用官方 source 基路径策略显式指定 |

## Example Prompts

- 基于 Tailwind 官方最新文档，给我一份 Vite 项目的最小可运行安装步骤和验证清单。
- 我在 React 项目里动态拼 class 导致样式丢失，按 Tailwind 官方规则帮我改成正确写法。
- 我想快速掌握 TailwindCSS，请按官方文档给一个 2 小时学习与实战路线。
