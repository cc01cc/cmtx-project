## Output Template

### 背景与问题

- 当前结构的主要痛点。
- 为什么这些问题影响开发效率或可维护性。

### 当前结构评估

| Package | Current Responsibilities | Boundary Issues | Notes |
| --- | --- | --- | --- |

### 推荐目标结构

| Package | Target Responsibility | Dependency Direction | Migration Notes |
| --- | --- | --- | --- |

### 分阶段迁移

- Phase 1: 结构准备
- Phase 2: 逻辑迁移
- Phase 3: 收口清理

### 兼容性与风险

| Risk | Impact | Likelihood | Mitigation |
| --- | --- | --- | --- |

### 验证结果

- build
- test
- lint
- docs/examples

## Checklist

- [ ] 已识别每个 package 的单一职责。
- [ ] 已检查循环依赖与反向依赖风险。
- [ ] 已明确 breaking or non-breaking 决策。
- [ ] 已给出 phased migration plan。
- [ ] 已给出可执行验证步骤与回滚关注点。
