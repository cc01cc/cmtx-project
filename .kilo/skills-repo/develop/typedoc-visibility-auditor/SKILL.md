---
name: typedoc-visibility-auditor
description: 审计 TypeDoc 导出面和可见性标注。用于 cleanup、public API audit、category tags 等。
license: MIT
metadata:
    category: documentation
    references:
        - https://kilo.ai/docs/customize/skills
        - https://agentskills.io/specification
---

整理 API 文档和导出面，把“哪些该暴露、哪些该隐藏、怎样分类”变成一套稳定规则。

## When to Use This Skill

在以下场景使用本 skill：

- 用户想整理 TypeDoc 结构或分类
- 用户想补 `@public` / `@internal` / `@private` 标注
- 用户怀疑导出面过大、过乱或暴露了内部实现
- 用户想让 API 文档按功能模块分组显示
- 用户在多个 package 中统一文档可见性规范

不要把本 skill 用于普通 README 润色。

## Required Inputs

尽量补齐：

1. 涉及哪些 package 或入口文件。
2. 当前 TypeDoc 或文档生成的主要痛点。
3. 项目是否有明确 public API 边界。
4. 是否已有分类体系或命名约定。
5. 是否需要同步修改文档生成配置。

## Audit Workflow

### 1. 界定 public API

先回答哪些符号属于真正的 public API：

- 是否直接从主入口 re-export
- 是否给外部调用方使用
- 是否应该被示例、README 或文档承诺

不要把“被 export 了”直接等同于“应该公开文档化”。

### 2. 标记 internal API

以下内容通常应优先标记为 internal 或从文档中排除：

- 仅服务内部拼装或桥接的 helper
- 临时兼容层或过渡导出
- 只为测试、构建或生成器服务的实现细节
- 不希望用户直接依赖的低层工具

### 3. 设计分类结构

分类时优先按功能域，而不是按文件名：

- 图片筛选
- 图片替换
- 元数据处理
- 配置解析
- 存储适配器

如果一个分类只是映射某个文件，而不是功能领域，通常说明分类设计不够稳定。

### 4. 审核导出聚合文件

重点检查 `index.ts` 或导出汇总文件：

- 是否把内部实现顺手暴露出去
- 是否存在重复导出或命名不一致
- 是否需要在聚合导出处加分类注释
- 是否应该拆分子入口而不是全部塞进一个总入口

### 5. 校验 TypeDoc 配置

确认这些点：

- `excludeInternal` 是否符合预期
- `categoryOrder` 是否稳定
- block tags 是否覆盖项目使用的标签
- 入口点是否准确反映 public API

## Templates and Checklists

可见性审计表、分类表、导出变更表与校验清单已拆分到：

- [references/TEMPLATES.md](./references/TEMPLATES.md)

## Visibility Heuristics

- 用户无需直接理解的符号，不应轻易公开。
- 文档层级应服务使用者，而不是镜像源码目录。
- 先收缩导出面，再优化文档结构，效果通常更稳定。
- 如果 public/internal 边界不清，优先写规则，不要先批量加标签。

常见失败模式与规避建议在参考文档中统一维护。

## Example Prompts

- 帮我审计这个 package 的 public API 和 internal API 边界。
- 我想给 TypeDoc 做分级分类，先出一套分类和可见性方案。
- 为什么我的 API 文档太乱，帮我从导出面和标签两层一起整理。
