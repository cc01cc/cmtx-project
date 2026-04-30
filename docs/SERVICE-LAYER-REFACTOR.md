# Service 层重构实施指南

**目标**：消除重复设计，明确 API 层级  
**预计工作量**：2-3 小时  
**涉及包**：core, asset, publish

---

## 快速概览

### 问题

- StorageService 是明确重复的设计（已废弃）❌
- CoreService 和 AssetService 是包装，但只有 publish/rules 需要 ✅
- 需要明确"何时用函数，何时用 Service"

### 解决方案

- ✅ 删除 StorageService（已废弃）
- ✅ 在 core/asset 中标记 Service 为"可选导出"
- ✅ 添加文档说明两种 API 的适用场景

---

## 实施步骤

### 步骤 1：删除已废弃的 StorageService

**文件**：`packages/publish/src/rules/services/storage-service.ts`

```bash
rm packages/publish/src/rules/services/storage-service.ts
```

**文件**：`packages/publish/src/rules/services/index.ts`

找到并移除：

```typescript
// ❌ 删除这些导出
/**
 * @deprecated 已废弃，请使用 @cmtx/storage 的 IStorageAdapter 和 @cmtx/asset 的 AssetService
 * @category 向后兼容
 */
export type { StorageService } from "../service-registry.js";

/**
 * @deprecated 已废弃，请使用 createAssetService()
 * @category 向后兼容
 */
export { createStorageService, StorageServiceImpl } from "./storage-service.js";
```

**新的 index.ts**：

```typescript
/**
 * Services 模块
 *
 * @module services
 * @description
 * 为 Rule 系统提供统一的 Service 接口。
 *
 * @remarks
 * ## 设计原则
 *
 * - **重新导出外部 Service**：从各包的 /services 入口导入
 * - **本地服务**：Rule 系统特定的服务（计数、回调、注册表）
 * - **无重复设计**：删除已废弃的 StorageService
 */

// ==================== 外部 Service 导出 ====================

/**
 * @category 外部服务
 */
export { AssetService, createAssetService } from "@cmtx/asset/services";
export type { AssetServiceConfig } from "@cmtx/asset/services";

/**
 * @category 外部服务
 */
export { CoreService, createCoreService } from "@cmtx/core/services";
export type { CoreServiceConfig } from "@cmtx/core/services";

// ==================== 本地服务 ====================

/**
 * @category 本地服务
 */
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

### 步骤 2：更新 @cmtx/core/package.json

添加 `/services` 导出路由：

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
            "import": "./dist/services/index.mjs",
            "require": "./dist/services/index.cjs"
        }
    }
}
```

### 步骤 3：更新 @cmtx/asset/package.json

添加 `/services` 导出路由：

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
            "import": "./dist/services/index.mjs",
            "require": "./dist/services/index.cjs"
        }
    }
}
```

### 步骤 4：更新 @cmtx/core 模块文档

**文件**：`packages/core/src/index.ts`

在文件顶部的 JSDoc 中添加使用方式说明：

```typescript
/**
 * @packageDocumentation
 *
 * @module @cmtx/core
 *
 * CMTX Core - Markdown 图片处理核心库
 *
 * ## 两种使用方式
 *
 * ### 方式 1：函数 API（推荐）
 *
 * 直接导入函数，零抽象、高性能。适用于 CLI、脚本、第三方集成等所有场景。
 *
 * \`\`\`typescript
 * import { filterImagesInText, replaceImagesInText, deleteLocalImage } from '@cmtx/core';
 *
 * // 筛选图片
 * const images = filterImagesInText(markdown);
 *
 * // 替换图片
 * const result = replaceImagesInText(markdown, replacements);
 *
 * // 删除图片
 * await deleteLocalImage('/path/to/image.jpg', { strategy: 'trash' });
 * \`\`\`
 *
 * ### 方式 2：Service API（可选）
 *
 * 统一的接口方式，支持依赖注入和易于测试。仅在需要时使用。
 *
 * \`\`\`typescript
 * import { CoreService, createCoreService } from '@cmtx/core/services';
 *
 * const service = createCoreService();
 * const images = service.filterImages(markdown);
 * \`\`\`
 *
 * **何时使用 Service API？**
 * - 需要 Service Registry 统一管理多个服务
 * - 实现 Rule 引擎或插件系统
 * - 需要依赖注入或 mock 服务进行单元测试
 * - 在 @cmtx/publish/rules 等规则系统中使用
 *
 * **何时使用函数 API？**
 * - 编写 CLI 命令 ✅ **推荐**
 * - 编写 MCP Server 工具 ✅ **推荐**
 * - 直接集成到第三方应用 ✅ **推荐**
 * - **绝大多数场景** ✅ **推荐**
 *
 * ## 核心功能
 * ... (保持原有的内容)
 */
```

### 步骤 5：更新 @cmtx/asset 模块文档

**文件**：`packages/asset/src/index.ts`

在 JSDoc 中添加类似的说明：

```typescript
/**
 * ## 两种使用方式
 *
 * ### 方式 1：函数 API（推荐）
 *
 * 直接调用功能函数，适合脚本和 CLI 场景。
 *
 * \`\`\`typescript
 * import { uploadLocalImageInMarkdown, ConfigBuilder } from "@cmtx/asset";
 *
 * const config = new ConfigBuilder()
 *   .storage(adapter)
 *   .prefix('images/')
 *   .build();
 *
 * const result = await uploadLocalImageInMarkdown(markdownPath, config);
 * \`\`\`
 *
 * ### 方式 2：Service API（可选）
 *
 * 统一的接口方式，用于 Rule 系统。
 *
 * \`\`\`typescript
 * import { AssetService, createAssetService } from "@cmtx/asset/services";
 *
 * const service = createAssetService({
 *   adapter: storageAdapter,
 *   prefix: 'images/'
 * });
 *
 * const result = await service.uploadImagesInDocument(content, baseDir);
 * \`\`\`
 */
```

### 步骤 6：在 @cmtx/core/README.md 中添加使用指南

**文件**：`packages/core/README.md`

在"快速开始"或"API"部分后添加：

```markdown
## 使用方式

### 推荐：函数 API

最轻量、最直接，适合所有场景。

\`\`\`typescript
import { filterImagesInText, replaceImagesInText } from '@cmtx/core';

// 筛选所有图片
const allImages = filterImagesInText(markdown);

// 筛选本地图片
const localImages = filterImagesInText(markdown, { sourceType: 'local' });

// 替换图片
const updated = replaceImagesInText(markdown, [{
identifier: { type: 'local', absolutePath: /\.\.\/images\// },
replacement: { src: 'https://example.com/images/{name}' }
}]);
\`\`\`

### 可选：Service 接口

当需要依赖注入或与 Rule 系统集成时使用。

\`\`\`typescript
import { CoreService, createCoreService } from '@cmtx/core/services';

const service = createCoreService({
logger: (level, message) => console.log(`[${level}] ${message}`)
});

const images = service.filterImages(markdown);
\`\`\`

**何时使用 Service？**

- [ ] 我在实现 @cmtx/publish Rule 系统
- [ ] 我需要 mock 或替换 core 功能进行单元测试
- [ ] 我需要统一的 Service Registry 来管理多个服务

如果都不是，**推荐使用函数 API**。
```

### 步骤 7：验证构建

```bash
# 构建所有包
pnpm build

# 如果有错误，检查：
# 1. 导入路径是否正确（/services 入口）
# 2. package.json exports 字段是否正确
# 3. 类型定义是否完整
```

### 步骤 8：运行测试

```bash
# 运行所有测试
pnpm test

# 运行特定包的测试
pnpm -F @cmtx/core test
pnpm -F @cmtx/asset test
pnpm -F @cmtx/publish test
```

---

## 验证清单

完成后检查：

- [ ] `storage-service.ts` 已删除
- [ ] `@cmtx/core/package.json` 包含 `./services` 导出
- [ ] `@cmtx/asset/package.json` 包含 `./services` 导出
- [ ] `@cmtx/core/src/index.ts` 有两种使用方式说明
- [ ] `@cmtx/asset/src/index.ts` 有两种使用方式说明
- [ ] `@cmtx/core/README.md` 有使用指南
- [ ] `@cmtx/asset/README.md` 有使用指南
- [ ] `pnpm build` 通过
- [ ] `pnpm test` 通过
- [ ] 无 TypeScript 错误：`pnpm -F @cmtx/core exec tsc --noEmit`

---

## 导入路径参考

重构后的导入方式：

```typescript
// ✅ 主导出（函数 API）
import { filterImagesInText } from "@cmtx/core";
import { uploadLocalImageInMarkdown } from "@cmtx/asset";

// ✅ 子路径导出（Service API）
import { CoreService, createCoreService } from "@cmtx/core/services";
import { AssetService, createAssetService } from "@cmtx/asset/services";

// ✅ Publish Rule 系统统一导出
import { CoreService, AssetService } from "@cmtx/publish/rules/services";
```

---

## 常见问题

### Q：为什么还要保留 Service API？

A：只有 @cmtx/publish 的 Rule 系统需要 Service 接口来支持：

- 统一的 ServiceRegistry
- 依赖注入
- 易于单元测试

其他包（CLI、MCP Server）不需要，直接用函数更高效。

### Q：CLI 需要改代码吗？

A：不需要。CLI 已经在用函数 API，继续保持现状。

### Q：这是 breaking change 吗？

A：对外部用户：否。Service 只是可选的。  
对内部开发：只改了 import 路径（从 `@cmtx/core` 改为 `@cmtx/core/services`）。

### Q：迁移需要多长时间？

A：2-3 小时。主要是：

- 删除 StorageService（15 分钟）
- 更新 package.json（15 分钟）
- 更新文档（1 小时）
- 测试和验证（30-45 分钟）

---

## 相关文档

- [ADR-011-service-layer-design.md](./ADR-011-service-layer-design.md) - 详细的架构决策记录
- [packages/core/README.md](../packages/core/README.md) - Core 包文档
- [packages/asset/README.md](../packages/asset/README.md) - Asset 包文档
