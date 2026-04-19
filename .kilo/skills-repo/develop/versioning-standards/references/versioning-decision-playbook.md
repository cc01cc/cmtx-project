# Versioning Decision Playbook

给出离线可执行的版本升级决策流程。

## Decision Flow

1. 先界定“公共契约”
   - API / CLI / 配置格式 / 数据格式 / 协议
2. 评估变更类型
   - 兼容修复
   - 兼容新增
   - 非兼容变更
3. 映射到版本动作
   - 修复 => patch
   - 新增 => minor
   - 破坏 => major
4. 评估预发布策略
   - 高风险变更先走 alpha/beta/rc
5. 补齐发布材料
   - 变更说明
   - 升级指引
   - 回滚方案

## Breaking Change Checklist

满足任一项通常视为 breaking：

- 删除或重命名公开 API
- 修改函数参数含义导致旧调用行为变化
- 改变默认行为且会影响既有生产用例
- 配置字段失效或语义变化
- 输出数据结构不兼容

## Recommended Release Notes Template

- Summary：版本目标
- Compatibility：兼容级别
- Changed：新增/修复
- Deprecated：已弃用项
- Removed：移除项
- Migration：升级步骤
- Risk：已知风险与缓解

## Anti-Patterns

- 为了“看起来稳定”而压低 major
- 在 patch 中引入行为变化
- 无迁移说明直接发布 breaking
- 用版本号掩盖真实风险（例如不标注 pre-release）

## Team Conventions (Suggested)

- 每次发布必须写“兼容性声明”
- deprecate 至少保留一个 minor 周期
- breaking 合并前需附迁移文档
- 自动化校验版本变更与变更类型的一致性
