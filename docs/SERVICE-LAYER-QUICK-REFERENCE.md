# 文档导航 - Service 层重构

> 快速跳转到相关文档

## 🎯 当前任务

### 决策背景

**问题**：底层包中重复导出 Service，设计混淆  
**解决**：明确"主导出"（函数）和"可选导出"（Service）的定位  
**状态**：提议中 → 待实施

---

## 📚 文档导读

### 1. 快速开始（首先阅读）

**→ [SERVICE-LAYER-REFACTOR.md](./SERVICE-LAYER-REFACTOR.md)**

- 7 个实施步骤
- 具体代码改动
- 验证清单
- 📊 预计 2-3 小时

### 2. 深入理解（详细讨论）

**→ [adr/ADR-011-service-layer-design.md](./adr/ADR-011-service-layer-design.md)**

- 问题背景和分析
- 三种方案对比
- 架构原则
- 迁移指南

---

## 🔄 改动概览

```
Before（混淆）：
├─ @cmtx/core
│  ├─ 函数 API（推荐）
│  └─ Service API（可选但不清楚）
│
└─ @cmtx/publish/rules/services
   ├─ 重新导出 CoreService ✅
   ├─ 重新导出 AssetService ✅
   └─ StorageService 占位符 ❌ 删除

After（清晰）：
├─ @cmtx/core
│  ├─ 主导出：函数 API（推荐）
│  └─ ./services 子路径：Service API（可选）
│
├─ @cmtx/asset
│  ├─ 主导出：函数 API（推荐）
│  └─ ./services 子路径：Service API（可选）
│
└─ @cmtx/publish/rules/services
   ├─ 从 @cmtx/core/services 导入
   ├─ 从 @cmtx/asset/services 导入
   └─ 无重复
```

---

## ✅ 检查清单

- [ ] 理解问题：为什么要改？
      → [问题背景](./adr/ADR-011-service-layer-design.md#2-关键洞察)

- [ ] 理解方案：怎么改？
      → [实施步骤](./SERVICE-LAYER-REFACTOR.md#实施步骤)

- [ ] 执行改动
      → [7 个步骤逐一完成](./SERVICE-LAYER-REFACTOR.md#实施步骤)

- [ ] 验证完成
      → [验证清单](./SERVICE-LAYER-REFACTOR.md#验证清单)

---

## 🤔 常见问题

### Q: 这会破坏现有代码吗？

**A**: 不会。

- CLI 继续用函数 API（无变化）
- MCP Server 继续用函数 API（无变化）
- 只有 publish/rules 的导入路径改了（从 `@cmtx/core` 改为 `@cmtx/core/services`）

### Q: 什么时候用函数 API，什么时候用 Service API？

**A**:

- **用函数 API**（99% 情况）：CLI、脚本、MCP Server、第三方集成
- **用 Service API**（1% 情况）：Rule 系统需要 ServiceRegistry 时

→ 详见 [使用指南](./adr/ADR-011-service-layer-design.md#6-迁移指南)

### Q: 需要修改多少文件？

**A**: 6 个文件

1. 删除 `packages/publish/src/rules/services/storage-service.ts`
2. 更新 `packages/publish/src/rules/services/index.ts`
3. 更新 `packages/core/package.json`
4. 更新 `packages/asset/package.json`
5. 更新 `packages/core/src/index.ts`
6. 更新 `packages/asset/src/index.ts`

---

## 📖 相关文档

| 文档                                                                         | 用途                        |
| ---------------------------------------------------------------------------- | --------------------------- |
| [SERVICE-LAYER-REFACTOR.md](./SERVICE-LAYER-REFACTOR.md)                     | 📋 实施指南（step-by-step） |
| [adr/ADR-011-service-layer-design.md](./adr/ADR-011-service-layer-design.md) | 🏛️ 架构决策（详细分析）     |
| [adr/README.md](./adr/README.md)                                             | 📚 所有 ADR 索引            |
| [../packages/core/README.md](../packages/core/README.md)                     | 📖 Core 包文档（待更新）    |
| [../packages/asset/README.md](../packages/asset/README.md)                   | 📖 Asset 包文档（待更新）   |

---

## 🚀 快速命令

```bash
# 1. 查看完整改动列表
cat docs/SERVICE-LAYER-REFACTOR.md

# 2. 查看架构决策详情
cat docs/adr/ADR-011-service-layer-design.md

# 3. 执行改动（按步骤执行）
# ... 见 SERVICE-LAYER-REFACTOR.md

# 4. 验证构建
pnpm build

# 5. 验证测试
pnpm test
```

---

## 💡 为什么要改？

**核心理由**：

1. ✅ **删除明确重复**：StorageService 已废弃，占用代码空间
2. ✅ **明确分层**：函数是一等 API，Service 是可选的
3. ✅ **减少困惑**：开发者不再纠结用哪个 API
4. ✅ **易于维护**：清晰的导出路由，有助于管理包的接口

---

## 📋 检查前的提醒

改动前：

- [ ] 确认没有其他正在进行的改动
- [ ] 创建特性分支
- [ ] 通知团队成员

改动后：

- [ ] 运行 `pnpm build`（确保编译无误）
- [ ] 运行 `pnpm test`（确保测试通过）
- [ ] 检查类型定义（`pnpm -F @cmtx/core exec tsc --noEmit`）
- [ ] 提交 PR 供审查

---

**更新时间**：2026-04-21  
**文档维护者**：@copilot  
**反馈**：如有疑问，请参考上述文档或提出 Issue
