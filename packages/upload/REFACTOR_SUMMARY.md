# Upload 包架构重构总结

## 重构目标
简化上传流程，提高代码的可维护性和可测试性，遵循 SOLID 设计原则。

## 核心改进

### 1. 移除过度设计
- ❌ 删除 `UniqueImage` 和 `UniqueImageMap` 类型（过度复杂的中间数据结构）
- ❌ 删除 `deduplicate` 配置字段（统一采用去重上传）
- ✅ 简化为直接使用 `Map<string, ImageCloudMapBody>` 存储上传映射

### 2. 引入上下文模式 (UploadContext)
```typescript
// 管理整个上传生命周期的共享状态
- 存储 cloudImageMap: 本地路径 -> 云端信息映射
- 提供 recordUpload() 和 getCloudImageMap() 方法
- 无需层层传递数据，各 Service 通过 Context 共享状态
```

### 3. Service 分离 - 单一职责
每个 Service 只接收自己需要的配置选项，而非整个 UploadConfig：

#### UploadService (upload-service.ts)
```typescript
uploadImages(
    localImagesWithAbs: LocalImageMatchWithAbsPath[],
    storageOptions: StorageOptions,  // ← 仅需 storage 配置
    context: UploadContext,
    logger?: LoggerCallback
): Promise<{ uploadedCount: number }>
```
- 功能：去重上传、记录结果到 context

#### ReplaceService (replace-service.ts)
```typescript
processFieldReplacements(
    localImagesWithAbs: LocalImageMatchWithAbsPath[],
    cloudImageMap: Map<string, ImageCloudMapBody>,  // ← 从 context 获取
    replaceOptions: ReplaceOptions,  // ← 仅需 replace 配置
    logger?: LoggerCallback
): Promise<{ replacedCount: number; filesModified: number }>
```
- 功能：字段级替换（src/alt/title）、模板渲染

#### DeleteService (delete-service.ts)
```typescript
deleteImages(
    localImagesWithAbs: LocalImageMatchWithAbsPath[],
    cloudImageMap: Map<string, ImageCloudMapBody>,
    deleteOptions: DeleteOptions,  // ← 仅需 delete 配置
    logger?: LoggerCallback
): Promise<{ deletedCount: number }>
```
- 功能：删除已上传和替换的本地图片

### 4. 主函数简化 (uploadLocalImageInMarkdown)
```typescript
// 前置：提取 logger
const log = logger ?? config.events?.logger;

// 创建上下文
const context = new UploadContext();

// 上传（必须）
await uploadImages(localImagesWithAbs, config.storage, context, log);

// 替换（条件执行）
if (config.replace) {
    await processFieldReplacements(
        localImagesWithAbs,
        context.getCloudImageMap(),
        config.replace,
        log
    );
}

// 删除（条件执行）
if (config.delete?.enabled) {
    await deleteImages(
        localImagesWithAbs,
        context.getCloudImageMap(),
        config.delete,
        log
    );
}
```

## 架构对比

| 维度 | 旧架构 | 新架构 |
|------|-------|-------|
| **中间数据结构** | UniqueImage/Map + 过度字段 | 简单 Map<absPath, CloudResult> |
| **配置传递** | 传整个 UploadConfig | 仅需要的 Options |
| **Service 耦合** | 相互依赖 | 通过 Context 解耦 |
| **代码行数** | ~300+ | ~150+ |
| **可测试性** | 困难（mock 复杂） | 易（参数显式） |
| **错误处理** | 不一致 | 统一（记录继续） |

## 删除的文件
- `deduplicator.ts` - 逻辑并入 UploadService
- `replacer.ts` - 逻辑并入 ReplaceService
- `result-builder.ts` - 结果由主函数直接聚合

## 新增文件
- `upload-context.ts` - 上下文管理
- `upload-service.ts` - 上传逻辑
- `replace-service.ts` - 替换逻辑
- `delete-service.ts` - 删除逻辑

## 修改的文件
- `types.ts` - 删除 UniqueImage/Map，添加 ImageCloudMapBody 导出，删除 deduplicate
- `uploader.ts` - 重构主函数，集成新 Services
- `config-adapter.ts` - 更新 deduplicate 兼容方法

## 关键设计决策

### 1. 去重策略简化
- 原来有分支：`deduplicate=true/false`
- 现在统一：始终去重（提取唯一的 absLocalPath）
- 理由：无重复上传同一张图片的使用场景

### 2. 错误处理策略
- 上传/替换/删除失败后记录日志，继续处理其他项
- 最终结果体现实际成功数
- 不中断流程

### 3. Logger 提前提取
```typescript
// 主函数开头
const log = logger ?? config.events?.logger;
// 统一传入各 Service，避免 config 传递
```

### 4. 参数显式性
```typescript
// ✅ 新方法：参数显式，契约清晰
uploadImages(images, storageOptions, context, logger)

// ❌ 旧方法：隐藏在 config 中，容易混淆
uploadUniqueImages(uniqueMap, config, logger)
```

## 兼容性
- 保留 `ImageCloudMapBody` 导出供外部使用
- 保留 `uploadDirectory()` 功能（逻辑相同）
- ConfigAdapter.getDeduplicateEnabled() 返回 true（向后兼容）

## 测试影响
- 需要更新测试：删除了 `deduplicator.ts`、`replacer.ts`、`result-builder.ts`
- 建议为新的 Service 编写单元测试
- UploadContext 易于 mock

## 后续优化建议
1. 添加并发控制（uploadDirectory 中的 concurrency 参数）
2. 实现 globalCache 机制（跨文件上传缓存）
3. 完善删除逻辑（支持回收站/永久删除）
4. 添加进度报告事件（config.events.onProgress）
