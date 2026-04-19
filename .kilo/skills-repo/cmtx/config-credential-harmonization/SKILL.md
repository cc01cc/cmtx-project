---
name: config-credential-harmonization
description: 统一设计配置文件、环境变量、凭证策略。用于 config design、credential resolution、env var substitution、secret priority 等。
license: MIT
metadata:
    category: configuration
    references:
        - https://kilo.ai/docs/customize/skills
        - https://agentskills.io/specification
---

把配置与凭证问题当成统一的横向能力来设计，而不是在每个命令、入口和适配器里重复发明规则。

## When to Use This Skill

在以下场景使用本 skill：

- 设计配置文件格式
- 设计凭证解析优先级
- 支持 `${VAR_NAME}` 环境变量模板替换
- 统一 CLI、服务端、插件、适配器的配置行为
- 改善缺失配置、错误配置或敏感信息处理方式

不要把本 skill 用于纯前端表单交互细节。

## Required Inputs

尽量先明确：

1. 配置会出现在哪些入口，例如 CLI、扩展、服务端、库。
2. 凭证来源有哪些，例如 config file、environment variables、runtime injection。
3. 是否允许明文凭证。
4. 需要支持哪些模板变量或替换语法。
5. 用户最常见的错误配置是什么。

## Harmonization Workflow

### 1. 先划分配置类别

把配置拆成三类：

- 普通行为配置，例如开关、前缀、命名模板、批量大小
- 连接或适配器配置，例如 region、bucket、endpoint
- 敏感凭证配置，例如 key、secret、token

这三类不要混成一套模糊规则。

### 2. 明确优先级

默认按下面顺序设计，并在文档里写死：

1. 运行时显式传入值
2. 入口级专用环境变量
3. 通用环境变量
4. 配置文件中的模板解析结果
5. 配置文件中的明文值
6. 安全的默认值

如果项目需要不同顺序，必须明确写出原因。

### 3. 定义模板替换规则

如果支持 `${VAR_NAME}`，就必须说明：

- 未设置时保留原字符串、报错还是警告
- 是否支持嵌套或多个变量
- 空字符串与未设置是否等价
- verbose 模式下如何输出诊断信息

不要让不同模块各自实现一套替换逻辑。

### 4. 设计缺失配置反馈

错误信息必须可行动：

- 缺少哪个字段
- 可以从哪些来源提供
- 当前尝试过哪些来源
- 下一步用户应该改什么

坏例子：

- `invalid config`

好例子：

- `Missing target bucket. Checked TARGET_OSS_BUCKET, OSS_BUCKET, and config.target.bucket.`

### 5. 处理明文凭证

如果允许配置文件里直接写敏感值：

- 必须明确标注为不推荐
- 需要建议 `.gitignore` 或本地配置策略
- 文档中要给出更安全的环境变量写法

### 6. 统一输出示例

每次设计结果至少给出：

- 推荐配置样例
- 环境变量样例
- 优先级说明
- 缺失字段时的错误信息示例

## Templates and Checklists

配置模型模板、优先级骨架、替换规则表和验证清单已拆分到：

- [references/TEMPLATES.md](./references/TEMPLATES.md)

## Design Heuristics

- 配置系统的核心目标是可预测，不是灵活到难以解释。
- 任何“智能猜测”都要慎用，优先显式规则。
- 错误信息和优先级文档是配置设计的一部分，不是附属品。
- 同一仓库内多个入口应共享解析规则，而不是各写各的。
- 对敏感字段采用安全默认值，避免无提示回退到危险行为。

常见错误模式与修正建议在参考文档中统一维护。

## Example Prompts

- 帮我统一 transfer 命令的凭证配置策略。
- 设计一套 config file + env var 的优先级规则。
- 我想支持 `${VAR_NAME}`，请给出完整的配置与错误处理方案。
