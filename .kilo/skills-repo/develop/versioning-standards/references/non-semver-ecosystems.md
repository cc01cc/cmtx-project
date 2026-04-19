# Non-SemVer Ecosystems: Key Rules

用于处理“不是纯 SemVer”的版本比较问题。

## Go Modules

- 主体仍是语义版本风格
- 存在 pseudo-version：`vX.0.0-yyyymmddhhmmss-abcdefabcdef`
- `v0` 阶段不承诺稳定兼容
- `v2+` 需要模块路径携带主版本后缀（如 `/v2`）

## Maven

- Maven 有自己的版本排序与限定规则
- 文档明确提到与 SemVer 2.0 并非完全兼容
- 比较中 qualifier（如 `alpha`, `beta`, `rc`, `snapshot`）有 Maven 特定序

结论：不要把 Maven 版本比较直接当作 SemVer 比较。

## Debian / dpkg

版本格式：`[epoch:]upstream-version[-debian-revision]`

比较关键点：

- 先 epoch，再 upstream，再 debian revision
- 使用分段比较（数字段与非数字段）
- `~` 具有特殊“非常小”排序语义

## RPM

- 常见三段：Epoch / Version / Release（EVR）
- Epoch 可覆盖普通排序（应谨慎使用）
- 版本比较为分段比较，不等同 SemVer 规则

## Practical Advice

- 跨生态讨论时先声明“采用哪套排序器”
- 一旦涉及 Debian/RPM/Maven，默认进入“不可直接套 SemVer”模式
- 对有争议的比较结果，优先引用对应官方规则
