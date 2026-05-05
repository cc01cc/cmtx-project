# ADR-011: Service 层设计与分层原则

**状态**: 提议中  
**创建日期**: 2026-04-21  
**最后更新**: 2026-04-21

## 1. 问题背景

### 当前状态

项目采用**四层架构**，分别定义了 Service 层来支持 Rule 系统：

```
第一层（基础）
├─ @cmtx/core
│  ├─ 函数 API（主要）
│  │  - filterImagesInText()
│  │  - replaceImagesInText()
│  │  - deleteLocalImage()
│  └─ Service API（可选）
│     - CoreService
│     - createCoreService()
│
├─ @cmtx/asset
│  ├─ 函数 API（上传/转移）
│  └─ Service API
│     - AssetService
│     - createAssetService()
│
└─ @cmtx/storage
   └─ 存储适配器接口

第三层（处理层）
└─ @cmtx/rule-engine
   └─ rules
      └─ services/
         ├─ 重新导出 CoreService
         ├─ 重新导出 AssetService
         └─ 本地服务（CounterService、CallbackService）
```

### 核心问题

**矛盾**：

- ❌ 底层包中定义 Service 违反了"底层不应该关心高层设计模式"的原则
- ❌ 如果底层不定义 Service，publish 需要重复封装所有底层包的功能
- ❌ StorageService 是明确的重复设计（已废弃）

**重复导出现象**：

```typescript
// @cmtx/rule-engine/rules/services/index.ts
export { CoreService, createCoreService } from "@cmtx/core";
export { AssetService, createAssetService } from "@cmtx/asset";
export { StorageServiceImpl, createStorageService } from "./storage-service.js"; // ❌ 重复！
```

**现有的两套 API**：

```typescript
// 路径 1：直接函数（推荐）
import { filterImagesInText } from "@cmtx/core";
const images = filterImagesInText(text);

// 路径 2：Service（高成本的包装）
import { CoreService } from "@cmtx/core/services";
const service = createCoreService();
const images = service.filterImages(text);
```

---

## 2. 关键洞察

### 2.1 谁真正需要 Service？

调查各个包的实际使用方式：

| 包                                        | 使用方式         | 需要 Service？ |
| ----------------------------------------- | ---------------- | -------------- |
| CLI (`@cmtx/cli`)                         | 直接调用函数     | ❌ 否          |
| MCP Server (`@cmtx/mcp-server`)           | 直接调用函数     | ❌ 否          |
| VS Code 扩展 (`@cmtx/vscode-extension`)   | 直接调用函数     | ❌ 否          |
| **Publish Rules** (`@cmtx/rule-engine/rules`) | **需要统一接口** | ✅ **是**      |

**结论**：只有 `@cmtx/rule-engine` 的 Rule 系统需要统一的 Service 接口！

### 2.2 Service 的真实价值

Service 存在的价值是什么？

```typescript
// ✅ 真实价值 1：统一的 Service Registry 接口
interface ServiceRegistry {
    register<T>(service: Service<T>): void;
    get<T extends Service>(id: string): T | undefined;
}

// ✅ 真实价值 2：依赖注入支持
// Rule 可以从 services 中获取任何需要的服务
const coreService = services.get<CoreService>("core");

// ✅ 真实价值 3：易于单元测试
// 可以 mock 或替换任何服务
const mockService = { ...coreService, filterImages: () => [] };
```

但这些都是**可选的**——CLI 和 MCP Server 并不需要这些！

---

## 3. 解决方案

### 3.1 设计原则

采用**"一主多辅"的导出路由策略**：

- **主导出**（默认）：函数 API - 所有使用场景都支持
- **辅导出**（可选）：Service API - 仅 Rule 系统需要

### 3.2 具体方案

#### 第一步：在 package.json 中明确导出路由

**@cmtx/core/package.json**

```json
{
    "exports": {
        ".": {
            "types": "./dist/index.d.ts",
            "import": "./dist/index.mjs",
            "require": "./dist/index.cjs"
        },
        "./services": {
            "types": "./dist/services/index.d.ts",
            "import": "./dist/services/index.mjs"
        }
    }
}
```

**@cmtx/asset/package.json**

```json
{
    "exports": {
        ".": {
            "types": "./dist/index.d.ts",
            "import": "./dist/index.mjs",
            "require": "./dist/index.cjs"
        },
        "./services": {
            "types": "./dist/services/index.d.ts",
            "import": "./dist/services/index.mjs"
        }
    }
}
```

#### 第二步：文档化两种使用方式

在各包的 README.md 中添加使用指南。

**@cmtx/core/README.md 示例：**

```markdown
## 使用方式

### 方式 1：函数 API（推荐）

直接导入函数，零抽象、高性能。适用于所有场景。

\`\`\`typescript
import { filterImagesInText, replaceImagesInText } from '@cmtx/core';

// 筛选图片
const images = filterImagesInText(markdown);

// 替换图片
const result = replaceImagesInText(markdown, [
{
identifier: 'local',
replacement: { src: '/images/new-path.jpg' }
}
]);
\`\`\`

### 方式 2：Service API（可选）

统一的接口方式，支持依赖注入和易于测试。仅在需要时使用。

\`\`\`typescript
import { CoreService, createCoreService } from '@cmtx/core/services';

const service = createCoreService();
const images = service.filterImages(markdown);
\`\`\`

**何时使用 Service API？**

- 需要 Service Registry 统一管理多个服务
- 需要依赖注入或 mock 服务进行单元测试
- 实现 Rule 引擎或插件系统

**何时使用函数 API？**

- 编写 CLI 命令
- 编写 MCP Server 工具
- 直接集成到第三方应用
- **绝大多数场景**
```

#### 第三步：清理 @cmtx/rule-engine/rules/services

移除已废弃的 StorageService，简化导出：

```typescript
/**
 * Services 模块
 *
 * @module services
 * @description
 * 提供 Rule 系统所需的统一 Service 接口和本地服务实现。
 *
 * @remarks
 * ## 设计原则
 *
 * - **重新导出底层 Service**：统一从各包获取 Service 接口
 * - **本地服务**：CounterService、CallbackService 等 Rule 系统特定服务
 * - **ServiceRegistry**：统一的服务注册表实现
 *
 * ## 服务来源
 *
 * - **外部 Service**（从其他包导入）
 *   - @cmtx/core/services: CoreService
 *   - @cmtx/asset/services: AssetService
 *
 * - **本地 Service**（在本包实现）
 *   - CounterService（ID 生成计数）
 *   - CallbackService（用户交互回调）
 *   - ServiceRegistry（服务注册表）
 */

// ==================== 重新导出外部 Service ====================

export { AssetService, createAssetService } from "@cmtx/asset/services";
export type { AssetServiceConfig } from "@cmtx/asset/services";

export { CoreService, createCoreService } from "@cmtx/core/services";
export type { CoreServiceConfig } from "@cmtx/core/services";

// ==================== 本地服务 ====================

export { CallbackServiceImpl, createCallbackService } from "./callback-service.js";
export { CounterServiceImpl, createCounterService } from "./counter-service.js";
export { createServiceRegistry, ServiceRegistryImpl } from "./service-registry-impl.js";

// ==================== 类型定义 ====================

export type {
    BuiltInServiceId,
    CallbackService,
    CallbackServiceConfig,
    CoreContext,
    CounterService,
    CounterServiceConfig,
    PresignedUrlService,
    PresignedUrlServiceConfig,
    RuleContext,
    Service,
    ServiceRegistry,
    ServiceTypeMap,
} from "../service-registry.js";
```

---

## 4. 实施方案

### 4.1 立即执行

✅ **删除已废弃的 StorageService**

```bash
# 删除文件
rm packages/publish/src/rules/services/storage-service.ts

# 更新导出
# 从 services/index.ts 移除 StorageService 相关导出
```

在 [packages/publish/src/rules/services/index.ts](packages/publish/src/rules/services/index.ts) 中：

- 删除 StorageService 类型定义导出
- 删除 storage-service.ts 文件导出
- 更新模块注释说明

### 4.2 第二阶段

✅ **在 @cmtx/core 和 @cmtx/asset 中添加 /services 导出路由**

更新 package.json 文件中的 `exports` 字段。

### 4.3 第三阶段

✅ **文档完善**

在各包的 README.md 中添加"使用方式"章节，明确两种 API 的适用场景。

---

## 5. 架构对比

### 当前架构（问题状态）

```
┌─────────────────────────────┐
│   @cmtx/core                │
├─────────────────────────────┤
│ 函数 API                    │
│ - filterImagesInText()      │
│ - replaceImagesInText()     │
│ - deleteLocalImage()        │
│                             │
│ Service API（重复/包装）    │
│ - CoreService              │
│ - createCoreService()      │
└─────────────────────────────┘
           ↑ (被 publish 重新导出并混合使用)

┌─────────────────────────────┐
│   @cmtx/rule-engine/rules       │
├─────────────────────────────┤
│ 重新导出：CoreService       │
│ 重新导出：AssetService      │
│ 本地：CounterService        │
│ 本地：CallbackService       │
│                             │
│ ❌ 重复：StorageService     │
└─────────────────────────────┘
```

### 改进后的架构

```
┌─────────────────────────────┐
│   @cmtx/core                │
├─────────────────────────────┤
│ 主导出（.）                 │
│ - filterImagesInText()      │
│ - replaceImagesInText()     │
│ - deleteLocalImage()        │
│                             │
│ 可选导出（./services）      │
│ - CoreService              │
│ - createCoreService()      │
└─────────────────────────────┘
        ↓ 用于需要 Service 的场景

┌─────────────────────────────┐
│   @cmtx/rule-engine/rules       │
├─────────────────────────────┤
│ 从 @cmtx/core/services 导入 │
│ 从 @cmtx/asset/services 导入│
│                             │
│ 本地服务                    │
│ - CounterService            │
│ - CallbackService           │
│ - ServiceRegistry           │
└─────────────────────────────┘
```

---

## 6. 迁移指南

### 对开发者的影响

| 角色                | 影响   | 操作                              |
| ------------------- | ------ | --------------------------------- |
| **CLI 开发**        | 无变化 | 继续直接使用函数 API              |
| **MCP Server 开发** | 无变化 | 继续直接使用函数 API              |
| **Rule 开发**       | 更清晰 | 从 `/services` 子路径导入 Service |
| **第三方集成**      | 更灵活 | 可选择函数或 Service API          |

### 导入路径变化

**Before（混淆）：**

```typescript
import { CoreService } from "@cmtx/core";
import { CoreService } from "@cmtx/rule-engine/rules";
// ❌ 不清楚应该从哪里导入
```

**After（清晰）：**

```typescript
// ✅ 想用函数？默认导出
import { filterImagesInText } from "@cmtx/core";

// ✅ 想用 Service？显式从子路径导入
import { CoreService } from "@cmtx/core/services";

// ✅ Publish Rule 系统统一导出
import { CoreService, AssetService } from "@cmtx/rule-engine/rules/services";
```

---

## 7. 设计原则总结

| 原则           | 说明                                       |
| -------------- | ------------------------------------------ |
| **一主多辅**   | 函数 API 是主，Service API 是可选辅助      |
| **分层清晰**   | 底层包不被高层模式所绑架                   |
| **选择自由**   | 开发者可根据场景选择合适的 API             |
| **文档明确**   | 清楚说明什么时候用什么，避免混淆           |
| **无重复设计** | 不再出现 StorageService 这样明确重复的代码 |

---

## 8. 检查清单

- [ ] 删除 `packages/publish/src/rules/services/storage-service.ts`
- [ ] 移除 `packages/publish/src/rules/services/index.ts` 中 StorageService 相关导出
- [ ] 更新 `@cmtx/core/package.json` - 添加 `./services` 导出路由
- [ ] 更新 `@cmtx/asset/package.json` - 添加 `./services` 导出路由
- [ ] 在 `@cmtx/core/README.md` 添加"使用方式"章节
- [ ] 在 `@cmtx/asset/README.md` 添加"使用方式"章节
- [ ] 更新导出注释（packages/core/src/index.ts）
- [ ] 更新导出注释（packages/asset/src/index.ts）
- [ ] 运行 `pnpm build` 验证构建
- [ ] 运行 `pnpm test` 验证测试

---

## 9. 参考资源

相关决策记录：

- [ADR-001-package-structure.md](./ADR-001-package-structure.md) - 包结构设计
- [ADR-004-template-package-redesign.md](./ADR-004-template-package-redesign.md) - 模板系统设计
