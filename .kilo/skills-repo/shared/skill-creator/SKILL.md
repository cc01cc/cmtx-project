---
name: skill-creator
description: 创建和迁移 KiloCode Agent Skills。用于新建 skill、重构、第三方 skill 迁移、规范检查。
license: MIT
metadata:
    category: development
    references:
        - https://kilo.ai/docs/customize/skills
        - https://agentskills.io/specification
        - https://agentskills.io/skill-creation/using-scripts
---

为 KiloCode 编写、重构、迁移 Agent Skills，并在需要时保留可复用脚本与参考资料。

## When to Use This Skill

在以下场景使用本 skill：

- 创建新的 KiloCode skill
- 重写或修复现有 SKILL.md
- 将 Claude、Composio、Cursor 或其他平台的 skill 迁移到 KiloCode
- 检查 third-party skill 是否存在 KiloCode 不兼容项
- 设计或审查 skill 的 scripts、references、assets 结构
- 需要把重复操作沉淀为 skill，而不是继续依赖临时提示词

## KiloCode Skill Model

先按 KiloCode 的加载模型理解 skill，再开始创建或迁移：

1. 仅 `name` 与 `description` 会在发现阶段被读取。
2. 仅当请求与 `description` 明确匹配时，agent 才会读取完整 `SKILL.md`。
3. 仅当流程需要时，agent 才会继续读取 `references/`、执行 `scripts/` 或使用 `assets/`。

按以下规则组织 skill：

- 令 `name` 与父目录名完全一致。
- 将通用 project skill 放在 `.kilo/skills/<skill-name>/`。
- 将 mode-specific skill 放在 `.kilo/skills-<mode-slug>/<skill-name>/`。
- 在用户级目录使用 `~/.kilo/skills/` 或 `~/.kilo/skills-<mode-slug>/`。
- 记住优先级：project skill 覆盖 global skill，mode-specific skill 覆盖 generic skill。
- 修改 `SKILL.md` 后重新加载 VS Code 或 Kilo Code 扩展，避免因缓存误判结果。

## Required Structure

至少提供以下结构：

```text
skill-name/
  SKILL.md
```

按需要补充以下目录：

```text
skill-name/
  SKILL.md
  scripts/
  references/
  assets/
```

各目录职责如下：

| Directory     | Purpose                        | Notes                          |
| ------------- | ------------------------------ | ------------------------------ |
| `scripts/`    | 执行可复用自动化逻辑           | 支持 Python、Shell、Node.js 等 |
| `references/` | 存放按需读取的说明文档         | 放详细规则、规范、样例         |
| `assets/`     | 存放输出中按原样使用的静态资源 | 放模板图、图标、字体、示例文件 |

## Frontmatter Rules

始终先修正 frontmatter，再处理正文。至少满足以下要求：

```yaml
---
name: my-skill
description: 说明 skill 做什么、何时触发、用户会怎样描述该任务。
license: MIT
---
```

遵守以下约束：

- `name` 仅使用小写字母、数字、连字符。
- `name` 必须与 skill 目录名完全一致。
- `description` 同时描述能力与触发场景，不要只写抽象名词。
- 如需补充环境要求，可在正文中明确说明依赖、网络、权限与运行方式。

## Workflow: Create a New KiloCode Skill

按以下顺序创建新 skill：

1. 明确使用场景。

- 收集 3 到 5 个真实用户请求样例。
- 提炼触发词、输出类型、边界条件。

2. 规划可复用资源。

- 判断是否需要 `scripts/`、`references/`、`assets/`。
- 将高频、易错、需确定性的逻辑优先沉淀为脚本。

3. 创建目录。

- 在 project scope 下创建 `.kilo/skills/<skill-name>/`。
- 或在 mode scope 下创建 `.kilo/skills-<mode-slug>/<skill-name>/`。

4. 编写 `SKILL.md`。

- 先写准确 frontmatter。
- 再写触发条件、工作流、故障排查、引用资源。

5. 补充资源目录。

- 将详细规范放入 `references/`。
- 将自动化逻辑放入 `scripts/`。
- 将静态资源放入 `assets/`。

6. 重新加载 KiloCode。

- 重新加载 VS Code 窗口或扩展。
- 再验证 skill 是否可见、是否会在正确请求下触发。

不要默认依赖 `init_skill.py`、`package_skill.py` 之类的外部辅助脚本。若项目自己提供了此类脚本，可使用，但必须在 skill 内明确说明其来源与用法，不要把它写成 KiloCode 内建能力。

## Workflow: Port a Third-Party Skill to KiloCode

将第三方 skill 迁移到 KiloCode 时，按以下顺序处理：

1. 盘点来源平台。

- 识别原始平台是 Claude、Composio、Cursor 还是其他系统。
- 记录原始目录结构、frontmatter 字段、脚本入口、资源路径。

2. 修正目录与命名。

- 将 skill 放到 `.kilo/skills/<skill-name>/` 或 `.kilo/skills-<mode>/`。
- 将 frontmatter `name` 改成与目标目录名一致。

3. 重写 `description`。

- 改为让 KiloCode agent 能据此自动判断触发场景的描述。
- 补足用户可能使用的表达方式，而不是只保留源平台术语。

4. 删除平台专属假设。

- 删除把源平台内建工具写成默认前提的内容。
- 删除仅适用于源平台的发布、打包、安装、注入流程。

5. 迁移资源目录。

- 保留仍然有效的 `scripts/`、`references/`、`assets/`。
- 修正所有相对路径引用。

6. 检查脚本兼容性。

- 保留可直接运行、非交互、依赖清晰的脚本。
- 改写依赖平台专有命令、环境变量、目录假设的脚本。
- 删除仅服务于源平台专有打包流程且在 KiloCode 中无意义的脚本。

7. 补充 KiloCode 验证步骤。

- 说明如何 reload。
- 说明如何确认 skill 已被发现与触发。

## Scripts Support

明确保留 bundled scripts 支持。KiloCode 基于 Agent Skills 规范，可使用 `scripts/` 目录，Python 不是问题；问题仅在于不要假设某个特定脚本是平台默认内建能力。

按以下规则使用脚本：

- 将复杂、重复、需要确定性的逻辑放进 `scripts/`。
- 在 `SKILL.md` 中明确列出可用脚本及用途。
- 使用相对路径引用脚本，例如 `scripts/process.py`。
- 说明运行方式、依赖、输入参数、输出格式。
- 保持脚本非交互式，避免等待 TTY 输入。
- 尽量让 stdout 输出结构化结果，让 stderr 输出诊断信息。

适合保留的脚本：

- `scripts/convert.py` 用于转换第三方 frontmatter
- `scripts/validate.py` 用于检查 skill 结构
- `scripts/scaffold.ps1` 用于批量生成目录骨架

需要警惕的脚本：

- 假设 Claude 或其他平台会自动注入环境变量的脚本
- 依赖源平台专有命令的脚本
- 需要交互式确认的脚本
- 只负责源平台 zip 打包且对 KiloCode 无实际价值的脚本

## Migration Checklist

迁移第三方 skill 时，逐项检查：

| Check                                  | Keep           | Adapt                            | Drop                       |
| -------------------------------------- | -------------- | -------------------------------- | -------------------------- |
| `name` 与目录名一致                    |                | 不一致时修正                     |                            |
| `description` 能触发 KiloCode 自动匹配 |                | 过于模糊时重写                   |                            |
| `scripts/` 非交互且依赖清晰            | 满足条件时保留 | 路径或命令不兼容时改写           | 仅服务源平台专有流程时删除 |
| `references/` 路径有效                 | 满足条件时保留 | 链接失效时修正                   | 内容完全重复且无价值时删除 |
| `assets/` 可直接复用                   | 满足条件时保留 | 路径需调整时改写引用             | 与任务无关时删除           |
| 源平台专有 metadata                    |                | 需改写为通用字段                 | 无意义时删除               |
| 打包/发布步骤                          |                | 改写为 KiloCode 文件系统部署说明 | 源平台专有流程时删除       |

## Verification

完成创建或迁移后，执行以下验证：

1. 检查 `SKILL.md` frontmatter 是否有效。
2. 检查 `name` 是否与目录名完全一致。
3. 重新加载 VS Code 或 Kilo Code 扩展。
4. 直接询问 agent 是否可访问该 skill。
5. 在会话中确认是否发生了对 `SKILL.md` 的读取。
6. 打开 Output 面板并查看 Kilo Code 相关日志。

## Troubleshooting

| Problem            | Likely Cause                          | Fix                                             |
| ------------------ | ------------------------------------- | ----------------------------------------------- |
| Skill 不出现       | `SKILL.md` 不在正确目录层级           | 将文件放到 `.kilo/skills/<skill-name>/SKILL.md` |
| Skill 不触发       | `description` 太模糊                  | 重写 `description`，写清楚能力与触发场景        |
| 读取失败           | `name` 与目录名不一致                 | 将 frontmatter `name` 改为目录名                |
| 迁移后脚本不可运行 | 依赖源平台环境或绝对路径              | 改成相对路径，补充依赖说明，去掉平台专有假设    |
| 修改无效           | 未 reload KiloCode                    | 重新加载 VS Code 窗口或扩展                     |
| 资源找不到         | `references/` 或 `assets/` 路径未更新 | 修正 `SKILL.md` 中的相对路径                    |

## References

- KiloCode skills documentation <https://kilo.ai/docs/customize/skills>
- Agent Skills specification <https://agentskills.io/specification>
- Using scripts in skills <https://agentskills.io/skill-creation/using-scripts>
