---
title: DEV-013 - CMTX 函数及 API 设计规范
category: dev-guide
sidebar_order: 13
lang: zh-Hans
---

# DEV-013: CMTX 函数及 API 设计规范

> 定义 CMTX 项目的函数和 API 设计规范，覆盖命名约定、参数设计、返回类型、错误处理、导出策略、跨包原则、Service 设计、CLI 命令、JSDoc 注释和 Review Checklist。

## 0. 概述与范围

### 0.1. 分层结构

本文档分三层：

- **Part 1（§1-§4）：通用函数规范**。适用于所有函数，无论是否公开导出。命名、参数、返回类型、错误处理。
- **Part 2（§5-§9）：API 规范**。公开导出需要额外遵守的规则。导出策略、跨包原则、Service 设计、CLI 命令、JSDoc。
- **Part 3（§10）：Review Checklist**。涵盖 Part 1 + Part 2 所有维度的检查清单。

### 0.2. 层次关系

- **Part 1 的规则**——API 必须做到（因为 API 本身就是函数/类型/类的公开组合）
- **Part 2 的规则**——内部函数不需要（`@internal` 标记、导出策略等仅公开导出相关）

---

## Part 1: 通用函数规范

### §1 命名约定

#### 1.1. 函数参数命名

**规则**: 配置参数统一使用 `options`

```typescript
// [OK] 正确
function filterImages(markdown: string, options?: FilterImagesOptions): ImageMatch[]
function uploadFile(options: UploadOptions): Promise<UploadResult>

// [FAIL] 错误
function filterImages(markdown: string, opts?: FilterImagesOptions)  // 不使用 opts
function uploadFile(config: UploadOptions)  // 不使用 config
function uploadFile(params: UploadOptions)  // 不使用 params
```

#### 1.2. 类型命名

**规则**:
- 函数选项类型: `XxxOptions`
- 结果类型: `XxxResult`
- 服务配置: `XxxConfig`
- 不使用 `I` 前缀
- 不使用缩写（`Res` → `Result`、`Cfg` → `Config`）

```typescript
// [OK] 正确
interface FilterImagesOptions { }
interface UploadResult { }
interface UploadServiceConfig { }

// [FAIL] 错误
interface IFilterImagesOptions { }  // 不使用 I 前缀
interface FilterConfig { }  // 函数选项不使用 Config
interface UploadRes { }  // 不使用缩写
```

#### 1.3. 属性命名

**规则**: 统一使用 camelCase

```typescript
// [OK] 正确
interface CosAdapterConfig {
  bucket: string;
  region: string;
}

// [FAIL] 错误
interface CosAdapterConfig {
  Bucket: string;  // 不使用 PascalCase
  Region: string;
}
```

**例外**: 与外部 SDK 交互时，在内部映射，对外暴露 camelCase。

#### 1.4. 函数命名

**规则**:

1. **动词 + 名词**: 函数名以动词开头，后接操作对象
   ```typescript
   // [OK] 正确
   function filterImages(markdown: string, options?: FilterImagesOptions): ImageMatch[]
   function parseImages(text: string): ParsedImage[]
   function addSectionNumbers(markdown: string, options?: SectionNumbersOptions): SectionNumbersResult

   // [FAIL] 错误 — 动词缺失
   function imagesFilter(markdown: string)  // 名词在前
   function markdownSectionNumbers(markdown: string)  // 以操作对象开头
   ```

2. **长度限制**: 函数名不超过 20 字符（超出需评审）
   ```typescript
   // [OK] ≤20 字符
   function formatMarkdownImage(options: FormatMarkdownImageOptions): string   // 19
   function generateCounterValue(value: number, config?: CounterValueConfig): string  // 20
   function removeSectionNumbers(markdown: string, options?: SectionNumbersOptions): SectionNumbersResult  // 20

   // [FAIL] >20 字符 — 需缩短
   function convertMarkdownImageToHtml(...)  // 26 → 应改为 toHtmlImage(11)
   ```

3. **成对对称**: 相反操作使用对称前缀
   ```typescript
   // [OK] 正确
   addSectionNumbers / removeSectionNumbers
   encryptString / decryptString

   // [FAIL] 错误
   addSectionNumbers / deleteSectionNumbers  // add/remove 不对称
   loadWASM / checkWasmLoaded  // 应统一为 loadWASM / isWasmLoaded
   ```

4. **方向标记**: 格式转换用 `{源}To{目标}` 或 `to{目标}{对象}`，前置方向标记
   ```typescript
   // [OK] 正确 — 方向标记
   function toHtmlImage(markdown: string, attrs?: Record<string, string>): string

   // [FAIL] 错误 — 方向标记后置
   function convertMarkdownImageToHtml(markdown: string)  // "convert" + 完整描述 → 过长
   ```

5. **统一动词表**: 同一语义使用统一动词，不混用

   | 语义 | 动词 | 示例 |
   |------|------|------|
   | 筛选 | `filter` | `filterImages` |
   | 解析 | `parse` | `parseImages`, `parseYamlFrontmatter` |
   | 生成（从结构化数据） | `format` | `formatMarkdownImage`, `formatHtmlImage` |
   | 转换格式 | `to` | `toHtmlImage` |
   | 提取 | `extract` | `extractFrontmatter`, `extractSectionHeadings` |
   | 新增 | `add` / `create` | `addSectionNumbers`, `createFF1Cipher` |
   | 删除 | `remove` / `delete` | `removeSectionNumbers`, `deleteFrontmatterFields` |
   | 更新 | `update` | `updateImageRefs` |
   | 设置 | `set` | `setImageDimensions` |
   | 判断 | `is` / `has` | `isWebSource`, `isWasmLoaded` |

```typescript
// 内部使用 camelCase，映射到 SDK 的 PascalCase
class TencentCOSAdapter {
  constructor(config: CosAdapterConfig) {
    this.sdkConfig = {
      Bucket: config.bucket,  // 内部映射
      Region: config.region,
    };
  }
}
```

---

### §2 参数设计

#### 2.1. 配置参数用 options 对象

**规则**: 如果函数有 2 个或以上可选/配置参数，统一包装为一个 options 对象。（SPRINT-015 DECISION-004）

```typescript
// [OK] 正确
function uploadFile(options: UploadOptions): Promise<UploadResult>

// [FAIL] 错误（参数超过 2 个时）
function uploadFile(
  filePath: string,
  prefix?: string,
  overwrite?: boolean,
  concurrency?: number,
): Promise<UploadResult>
```

#### 2.2. 参数顺序

**规则**: 必选参数在前，options 对象在最后。

```typescript
function filterImages(markdown: string, options?: FilterImagesOptions): ImageMatch[]
//                   ↑ 必选                  ↑ 可选配置
```

#### 2.3. Service 构造函数统一 config 对象

**规则**: 所有 Service 类统一使用 `constructor(config: ServiceConfig)` 模式，logger 必须嵌套在 config 中。（SPRINT-015 DECISION-001）

```typescript
// [OK] 正确
class UploadService {
  constructor(config: UploadServiceConfig) {
    // config 中包含所有依赖，包括可选的 logger
  }
}

// [FAIL] 错误
class UploadService {
  constructor(config: UploadServiceConfig, logger?: Logger)  // logger 应嵌套在 config 中
}
```

---

### §3 返回类型

#### 3.1. 标准 Result 字段

**规则**: 操作结果类型统一使用以下字段。（SPRINT-015 DECISION-002）

| 字段 | 类型 | 说明 |
|------|------|------|
| `succeeded` | `number` | 成功计数 |
| `failed` | `number` | 失败计数 |
| `skipped` | `number` | 跳过计数 |
| `content` | `string` | 处理后的内容（可选） |
| `errors` | `Error[]` | 错误详情（可选） |

```typescript
// [OK] 正确
interface UploadResult {
  succeeded: number;
  failed: number;
  skipped: number;
  content?: string;
  errors?: Error[];
}

// [FAIL] 错误
interface UploadResult {
  uploaded: number;   // 不使用 uploaded
  success: number;    // 不使用 success
  transferred: number; // 不使用 transferred
}
```

#### 3.2. 扩展 Result 类型

**规则**: 在标准字段基础上扩展特定字段。

```typescript
interface UploadResult extends OperationResult {
  uploads: { original: string; newUrl: string }[];
}

interface DownloadResult extends OperationResult {
  downloads: { original: string; localPath: string }[];
}
```

#### 3.3. 返回类型人体工学（P5）

**规则**: 当函数的返回值需要频繁进行模式化判断（判空、格式化、遍历）时，考虑包装为结果类。但不要在简单场景（如 `filterImages` 返回图片列表，消费者只需 `.map()`）中过度设计。（源自 SPRINT-009 P5）

```typescript
// [OK] 需要频繁模式化判断时，使用结果类
interface ValidationResult {
  valid: boolean;
  errors: ConfigValidationError[];
  hasFatal(): boolean;
  format(): string;
}

// [OK] 简单列表场景直接返回数组
function filterImages(markdown: string, options?: FilterImagesOptions): ImageMatch[]
```

---

### §4 错误处理

#### 4.1. 错误类型

**规则**: 使用自定义错误类型，继承 `Error`。

```typescript
class CmtxError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'CmtxError';
  }
}
```

#### 4.2. 错误码

**规则**: 使用大写字母和下划线的常量定义错误码。

```typescript
const ERROR_UPLOAD_FAILED = 'UPLOAD_FAILED';
const ERROR_DOWNLOAD_FAILED = 'DOWNLOAD_FAILED';
```

---

## Part 2: API 规范

### §5 导出策略

#### 5.1. 一主多辅（函数 API 优先）

**规则**: 函数 API 是主导出（默认），Service API 是辅导出（可选，仅 Rule 系统需要）。（源自 ADR-011）

每个包的公共入口（`src/index.ts`）应优先暴露纯函数 API。Service 接口仅当存在 Rule 引擎这类需要运行时多态的消费者时才提供。

```typescript
// [OK] 函数 API 是主导出
export { filterImages, updateImageRefs } from "./filter.js";
export { type ImageMatch, type ReplaceOptions } from "./types.js";

// Service API 作为辅导出（仅当需要时才暴露）
export { createUploadService, type UploadService } from "./services/upload-service.js";
```

#### 5.2. 禁止不必要的 re-export

**规则**: 从底层包 re-export 类型时，确认此 re-export 有实际消费者。SPRINT-010 RQ-014 的经验表明，大多数 re-export 零消费者。（源自 SPRINT-010）

```typescript
// [FAIL] 零消费者的 re-export
export type { IStorageAdapter } from "@cmtx/storage";  // 消费者直接从 @cmtx/storage 导入
export type { UploadService } from "@cmtx/asset";       // 同上
```

#### 5.3. 私有化 API 用 @internal + 停止 barrel 导出

**规则**: 私有化的 API 不能只在 JSDoc 上加 `@internal`，必须同时从 barrel（`index.ts`）移除导出。

```typescript
// [OK] 正确：@internal + 不导出
/** @internal */
export class ServiceRegistryImpl { ... }  // 此处虽保留 export（供包内测试），但不从 index.ts 导出

// [FAIL] 错误：只有 @internal 标签
/** @internal */
export class ServiceRegistryImpl { ... }  // 仍从 index.ts 导出
```

#### 5.4. 避免零消费者导出

**规则**: 增加新导出前先确认包外是否有消费者。使用 `scripts/api-surface.sh` 检查。（源自 SPRINT-010 经验）

#### 5.5. 子路径显式导出（P10）

**规则**: 子路径 index 文件应显式列出导出项。禁止 `export *`。每个子路径应有清晰的消费者故事。（源自 SPRINT-009 P10）

```typescript
// [OK] 正确：显式列出
export { createDownloadService } from "./download-service.js";
export type { DownloadOptions } from "./types.js";

// [FAIL] 错误
export * from "./download-service.js";
export * from "./types.js";
```

#### 5.6. 向后兼容与版本策略

- 当前版本处于 `0.x` 开发阶段，禁止使用 major bump
- 破坏性变更在 minor 版本发布（如 `0.1.0` → `0.2.0`）
- 常规更新（新功能、bug 修复、内部优化）使用 patch（如 `0.1.0` → `0.1.1`）
- `0.x` 阶段不保留废弃的 API，也不要求迁移文档
- 破坏性变更仅在 changelog 中记录，供消费者参考

#### 5.7. 废弃 API 处理（P6）

**规则**: 标记 `@deprecated` 时必须同步计划移除时间，在下一个发布窗口移除。不要保留 forwarding alias。（源自 SPRINT-009 P6）

```typescript
/**
 * @deprecated Use filterImages(markdown, options) instead.
 * The logger parameter is now part of FilterImagesOptions.
 * Remove in next minor version.
 */
export function filterImages(
  markdown: string,
  options?: ImageFilterOptions,
  logger?: Logger
): ImageMatch[] {
  return newFilterImages(markdown, { ...options, logger });
}
```

---

### §6 跨包设计原则

以下原则用于在整个项目中定位和设计 API，确保跨包 API 的职责边界、类型归属和依赖方向合理。

#### 6.1. P1: 包作用域感知

**规则**: 符号名称不应重复包/模块名已表达的领域上下文。（源自 SPRINT-009 P1）

```typescript
// [OK] @cmtx/core 中所有函数已处于"文本处理"上下文
function filterImages(markdown: string, options?: ImageFilterOptions)

// [FAIL] 不应添加 InText 后缀
function filterImagesInText(...)  // 包名 core 已暗示文本处理
```

#### 6.2. P2: 统一命名约定

**规则**: 全项目使用一致的命名模式。同一角色在不同包中应使用相同命名模式。（源自 SPRINT-009 P2）

| 角色 | 模式 | 示例 |
|------|------|------|
| Service 类 | `{Verb}Service` | `DownloadService`, `UploadService` |
| 工厂函数 | `create{Verb}{Role}` | `createDownloadService` |
| Builder | `{Domain}Builder` / `{Domain}ConfigBuilder` | `TransferConfigBuilder` |

#### 6.3. P3: 层级消歧

**规则**: 不同层的相似概念必须命名可区分。编排层使用高层抽象名称，子模块层使用更具体的名称。（源自 SPRINT-009 P3）

#### 6.4. P4: 统一实例化模式

**规则**: 同一层次的同类对象使用统一的实例化方式，优先使用工厂函数 `create{Verb}Service(config)`，避免混用工厂函数和 `new`。（源自 SPRINT-009 P4）

#### 6.5. P5: 返回类型人体工学

详见 §3.3。此原则同时适用于函数设计和跨包 API 设计。（源自 SPRINT-009 P5）

#### 6.6. P6: 无废弃残留

详见 §5.7。标记 `@deprecated` 时必须同步计划移除时间，在下一个发布窗口移除。（源自 SPRINT-009 P6）

#### 6.7. P7: API 归属遵循分层职责

**规则**: API 的归属由操作类型决定，各层职责划分如下：（源自 SPRINT-009 P7）

| 层 | 包 | 职责 | 示例 |
|----|----|------|------|
| 基础层 | `@cmtx/core` | 纯内存操作，无文件 IO 无外部资源 | 正则匹配、文本替换、YAML 解析、Luhn 算法 |
| 模板层 | `@cmtx/template` | 模板渲染 | 模板字符串处理 |
| 存储层 | `@cmtx/storage` | 对象存储适配器 | OSS/COS 上传下载、签名 URL |
| 编排层 | `@cmtx/asset` | 文件 IO、外部资源编排、多步骤流程 | 图片下载/上传/转移、配置加载 |
| 引擎层 | `@cmtx/rule-engine` | 规则引擎编排 | 预设执行、批量处理 |

- core 的 API 不能放在 asset，asset 的 IO API 不能放在 core
- 下层包（core/template/storage）不得依赖上层包（asset/rule-engine）
- 违反示例：`@cmtx/core` 不应包含 `fs.readFile`，`@cmtx/rule-engine` 不应包含 OSS 上传逻辑

#### 6.8. P8: 消除重复实现

**规则**: 消费者必须 import 源头包或委托给源头包，不允许维护独立副本。（源自 SPRINT-009 P8）

**实例**: vscode-extension 的 `env-substitution.ts` 和 `image-processor.ts` 曾分别是 asset 和 core 的重复副本。

#### 6.9. P9: 内部类型卫生

**规则**: 不导出实现细节。增加新导出前先问外部消费者是否需要此类型。（源自 SPRINT-009 P9）

#### 6.10. P10: 子路径 API 设计

详见 §5.5。（源自 SPRINT-009 P10）

---

### §7 Service 设计规范

#### 7.1. 工厂函数模式

**规则**: Service 统一通过工厂函数创建，而非直接 `new`。（SPRINT-015 DECISION-001）

```typescript
// [OK] 正确
const uploadService = createUploadService({ adapter, prefix });
const counterService = createCounterService({ initialValue: 0 });

// [FAIL] 错误
const uploadService = new UploadService(adapter, prefix);
```

#### 7.2. Logger 通过 config 注入

**规则**: Logger 通过 config 对象注入，而非构造参数或全局单例。（SPRINT-015 DECISION-005）

```typescript
interface UploadServiceConfig {
  adapter: IStorageAdapter;
  logger?: Logger;  // 可选，默认 dummyLogger
}
```

#### 7.3. Service 与函数 API 的边界

**规则**: 函数 API 优先，Service API 作为可选辅助。

只有当调用方需要运行时多态（如 Rule 引擎通过 `services.get<T>()` 获取服务）时才提供 Service 接口。CLI 和 MCP Server 优先使用函数 API。（源自 ADR-011 + ANALYSIS-005）

---

### §8 CLI 命令规范

#### 8.1. 命令选项定义

**规则**: 所有命令选项定义在 `types/cli.ts`，必须 extend `GlobalOptions`。

```typescript
// types/cli.ts
export interface UploadCommandOptions extends GlobalOptions {
  // 特定选项
}

// commands/image/upload.ts
import type { UploadCommandOptions } from '../../types/cli.js';

export async function handler(options: UploadCommandOptions): Promise<void> {
  // 实现
}
```

#### 8.2. Handler 参数命名

**规则**: 使用 `options`，与函数参数命名规范保持一致。

```typescript
// [OK] 正确
export async function handler(options: UploadCommandOptions): Promise<void>

// [FAIL] 错误
export async function handler(argv: UploadCommandOptions)  // 使用 argv
```

#### 8.3. 避免属性冲突

**规则**: 不同语义的属性使用不同名称。

```typescript
// [OK] 正确
interface FormatCommandOptions extends GlobalOptions {
  outputPath?: string;  // 输出文件路径
}

// [FAIL] 错误
interface FormatCommandOptions extends GlobalOptions {
  output?: string;  // 与 GlobalOptions.output (OutputFormat) 冲突
}
```

---

### §9 JSDoc 注释规范

#### 9.1. 公开导出——必须完整的 JSDoc

**规则**: 所有从 `index.ts` 导出的公开 API（函数、类、接口、类型）必须包含 `@param`、`@returns`、`@example`。

```typescript
/**
 * 筛选 Markdown 中的图片
 * @param markdown - Markdown 文本
 * @param options - 筛选选项
 * @returns 匹配的图片列表
 * @example
 * ```typescript
 * const images = filterImages("# Hello\n\n![alt](img.png)");
 * // → [{ src: "img.png", alt: "alt" }]
 * ```
 */
export function filterImages(
  markdown: string,
  options?: FilterImagesOptions
): ImageMatch[];
```

#### 9.2. 内部函数——至少一行描述

**规则**: 不公开导出的内部函数、类型至少有一行功能描述。

#### 9.3. @internal——私有化 + 停止 barrel 导出

**规则**: 标记 `@internal` 时必须同时从 barrel（`index.ts`）移除导出。仅加标签不移除导出属于规范违规。

#### 9.4. @deprecated——注明替代方案

**规则**: 标记 `@deprecated` 时必须提供迁移说明，包括替代函数名称和移除计划。

```typescript
/**
 * @deprecated Use filterImages(markdown, options) instead.
 * Remove in next minor version.
 */
```

#### 9.5. 新增公开 API 需同步到 API 文档

**规则**: 新增公开导出后，必须在 `docs/api/` 下对应包的 API 文档中补充签名、参数表、返回值和示例。README 只展示代表性 API，不要求完整同步。TypeDoc 注释应完整，至少包含功能说明和参数描述。（源自 DEV-001 §12）

---

## Part 3: Review

### §10 Review Checklist

实施代码 review 时逐项检查。

#### 10.1. 函数维度（Part 1）

- [ ] 参数使用 `options` 命名（如有配置参数）
- [ ] 类型使用 `XxxOptions` / `XxxResult` / `XxxConfig`，禁止 I 前缀和缩写
- [ ] 属性使用 camelCase
- [ ] 参数顺序：必选在前，options 在最后
- [ ] Service 构造函数统一 config 对象，logger 嵌套在 config 中
- [ ] Result 类型使用 `succeeded/failed/skipped` 标准字段
- [ ] 错误处理：继承 Error，错误码大写+下划线
- [ ] 函数名 ≤ 20 字符（超长需评审）
- [ ] 同一提供商的命名前缀统一（`AliyunCredentials` + `AliyunOSSAdapter`，非 `Ali`）
- [ ] 同类实体的前缀对称（`TencentCOSAdapter` + `TencentCOSAdapterConfig`）
- [ ] 跨包同名概念的 API 对称（fpe-wasm ↔ autocorrect-wasm 的加载方式、类型导出应一致）

#### 10.2. API 维度（Part 2）

- [ ] 新增的公开导出是否有包外消费者？（运行 `api-surface.sh` 检查）
- [ ] 是否有不必要的 re-export？
- [ ] 私有化的 API 是否同时加了 `@internal` 并停止 barrel 导出？（两者必须同时做）
- [ ] `@public` / `@internal` 标注是否与 barrel 导出匹配？
- [ ] 废弃 API 是否标记了 `@deprecated` 并注明替代方案？
- [ ] 新增功能后，同模块是否有旧 API 可清理？
- [ ] 跨包迁入后，原调用方是否已更新？
- [ ] 子路径禁止 `export *`
- [ ] 新增导出是否遵循了 P1-P10 原则？
- [ ] CLI 命令选项是否 extend GlobalOptions、handler 参数是否用 `options`？

#### 10.3. JSDoc 维度（§9）

- [ ] 公开导出的 API 是否包含完整的 `@param`、`@returns`、`@example`？
- [ ] 新增/删除的公开 API 是否同步到 `docs/api/` 对应文档？
- [ ] 运行 `node scripts/check-api-docs-sync.mjs` 确认无 SIGNATURE 警告？

#### 10.4. 自动化检查工具

**消费者检查** — `bash scripts/api-surface.sh [package]`

检查各包 barrel 导出是否有包外消费者。零消费者的导出应评估是否应标记 `@internal` 或移除。

例：
```bash
bash scripts/api-surface.sh core      # 仅检查 @cmtx/core
bash scripts/api-surface.sh           # 检查所有包
```

**文档同步检查** — `node scripts/check-api-docs-sync.mjs [package]`

检查 `docs/api/*.md` 手写文档与代码是否同步，覆盖：

| 报告标记 | 含义 | 处理方法 |
|---------|------|---------|
| `[MISSING]` | 代码中公开导出但文档未收录 | 补充文档 |
| `[STALE]` | 文档中存在但代码中已不存在 | 清理文档 |
| `[SIGNATURE]` | 文档中函数参数名与代码不一致 | 修正文档签名 |

例：
```bash
node scripts/check-api-docs-sync.mjs core   # 仅检查 @cmtx/core
node scripts/check-api-docs-sync.mjs        # 检查所有包
```

**排查消费者技巧**：

```bash
# 确认某个符号是否有跨包消费者（精确匹配 import 语句）
grep -rl --include='*.ts' \
  "import[^;]*\bFoo\b[^;]*from\s*['\"]@cmtx/xxx['\"]" \
  packages/ | grep -v "packages/xxx/"

# 列出所有从某个包导入的符号（全局视角）
grep -roh 'from "@cmtx/core"[^;]*' packages/ \
  | grep -v "packages/core/" \
  | grep -oP '\{\s*\K[^}]+' | tr ',' '\n' | sed 's/^ *//' | sort -u
```

**死亡 API 排查工作流**：

对 `api-surface.sh` 报告的零消费者导出，按以下步骤判断是否应标记 `@internal` 或移除：

1. **包内引用**：确认是否仅在定义文件和 barrel 中出现，无其他调用方
   ```bash
   grep -rn '\bFoo\b' packages/xxx/src/ | grep -v 'index.ts'
   ```
2. **功能覆盖**：同模块内是否存在功能覆盖的上层 API
   - 底层辅助函数（如 `updateImageAttribute`）已被高层 API（如 `setImageDimensions` / `replaceImages`）覆盖 → 内部化
   - 跨层下沉残留（如 `applyReplacementOps`）下沉后原调用方未更新 → 内部化
   - 独立的公共原语（如 `filterImages`）有真实消费者 → 保留
3. **模式判断**：零消费者 + 无独立功能价值 = 死亡 API


---

## 附录 A

> 应用层交互设计（CLI 命令结构、VS Code 命令命名、MCP 工具设计）待后续 SPRINT 补充。
