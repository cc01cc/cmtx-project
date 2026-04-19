# Versioning Reference Index (Offline)

本目录用于离线回答常见版本号问题，减少对在线抓取的依赖。

## Priority

1. 先查本目录离线文档
2. 本地无法覆盖或用户要求“最新官方原文”时，再按 `official-versioning-urls.md` 在线获取

## Local Documents

- `semver-core-and-practice.md`：SemVer 2.0 核心规则与实践
- `python-pep440-practice.md`：PEP 440 版本格式、排序与规范化
- `dependency-range-cheatsheet.md`：npm / Cargo / Python 范围语法与差异
- `non-semver-ecosystems.md`：Go / Maven / Debian / RPM 的关键比较规则
- `versioning-decision-playbook.md`：版本升级决策与发布检查清单

## Quick Lookup

- 比较 `1.2.3-alpha.1` vs `1.2.3`：先看 `semver-core-and-practice.md`
- Python `1!1.0` / `.post` / `.dev`：先看 `python-pep440-practice.md`
- `^`、`~`、`~=` 含义：先看 `dependency-range-cheatsheet.md`
- Debian / RPM / Maven 排序争议：先看 `non-semver-ecosystems.md`
- “该 bump major 还是 minor”：先看 `versioning-decision-playbook.md`
