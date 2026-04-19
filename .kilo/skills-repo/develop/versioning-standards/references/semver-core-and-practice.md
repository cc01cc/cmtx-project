# SemVer Core and Practice

基于 SemVer 2.0.0 的离线摘要。

## Core Format

`MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]`

- MAJOR：不兼容变更
- MINOR：向后兼容新增
- PATCH：向后兼容修复
- PRERELEASE：预发布标识，优先级低于正式版
- BUILD：构建元数据，不参与优先级比较

## Comparison Rules

1. 先比较 MAJOR、MINOR、PATCH（数值比较）
2. 正式版高于同核心版本的预发布版
3. 预发布标识按 `.` 分段逐段比较：
   - 纯数字段按数值
   - 字母或连字符段按 ASCII 字典序
   - 数字段优先级低于非数字段
   - 若前缀都相等，段数更多者优先级更高
4. `+BUILD` 不影响优先级

## Canonical Examples

- `1.0.0-alpha < 1.0.0`
- `1.0.0-alpha.1 < 1.0.0-alpha.beta < 1.0.0-beta < 1.0.0`
- `1.0.0+build.1 == 1.0.0+build.2`（排序上等价）

## Practical Bump Guide

- 仅修 bug（不破坏 API）：`PATCH +1`
- 新增兼容能力：`MINOR +1` 且 `PATCH = 0`
- 破坏兼容：`MAJOR +1` 且 `MINOR = PATCH = 0`

## Common Pitfalls

- 误把 `+build` 当排序依据
- 将“内部实现变更”误判为 breaking（需看公共 API 行为）
- 在 `0.y.z` 阶段错误承诺稳定性（通常视为开发期）

## Suggested Team Policy

- 对外发布必须有 changelog
- 标记 deprecated 时至少经历一个 MINOR 周期后再删除
- 重大变更需提前发布 RC（例如 `2.0.0-rc.1`）
