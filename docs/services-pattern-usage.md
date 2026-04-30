# Services 模式使用指南

## 概述

新的 Services 模式将 RuleContext 的核心数据与扩展能力分离：

- **CoreContext**: 包含 `document`, `filePath`, `baseDirectory`（所有 Rule 都需要）
- **ServiceRegistry**: 通过 `services.get<T>()` 按需获取扩展能力

## 核心接口

```typescript
interface RuleContext {
    document: string;
    filePath: string;
    baseDirectory?: string;
    services: ServiceRegistry;
}

interface ServiceRegistry {
    register<T>(service: Service<T>): void;
    get<T extends Service>(id: string): T | undefined;
    has(id: string): boolean;
    getAllIds(): string[];
}
```

## 使用示例

### 1. 创建 RuleContext

```typescript
import {
    createServiceRegistry,
    createStorageService,
    createCounterService,
    createCallbackService,
} from "@cmtx/publish";

// 创建服务注册表
const services = createServiceRegistry();

// 注册存储服务
services.register(
    createStorageService({
        adapter: "aliyun-oss",
        config: { accessKeyId, accessKeySecret, region, bucket },
        prefix: "blog/images",
    }),
);

// 注意：命名模板在上层配置（upload.namingTemplate），Storage 层不处理命名逻辑

// 注册计数器服务
services.register(createCounterService({ initialValue: 1, step: 1 }));

// 注册回调服务
services.register(
    createCallbackService({
        onFileExists: async (fileName, remotePath, remoteUrl) => {
            // 返回 'skip' | 'replace' | 'download'
            return "replace";
        },
        onProgress: (message) => console.log(message),
    }),
);

// 构建 RuleContext
const context: RuleContext = {
    document: "# Hello World",
    filePath: "/path/to/file.md",
    baseDirectory: "/path/to",
    services,
};
```

### 2. 在 Rule 中使用服务

```typescript
import type { Rule, RuleContext, RuleResult } from "@cmtx/publish";
import type { StorageService, CounterService, CallbackService } from "@cmtx/publish";

export const myRule: Rule = {
    id: "my-rule",
    name: "My Rule",

    async execute(context: RuleContext): Promise<RuleResult> {
        const { document, services } = context;

        // 获取存储服务
        const storage = services.get<StorageService>("storage");
        if (storage) {
            const remoteUrl = await storage.upload("/local/path.png", "remote/path.png");
        }

        // 获取计数器服务
        const counter = services.get<CounterService>("counter");
        if (counter) {
            const nextId = counter.next();
        }

        // 获取回调服务
        const callback = services.get<CallbackService>("callback");
        if (callback?.onProgress) {
            callback.onProgress("Processing...");
        }

        return { content: document, modified: false };
    },
};
```

### 3. 向后兼容

旧代码仍然可以工作，但建议迁移到新的 services 模式：

```typescript
// 旧方式（仍然支持，但已标记为 deprecated）
const context: RuleContext = {
    document,
    filePath,
    storage, // deprecated
    nextCounterValue, // deprecated
    onFileExists, // deprecated
    onProgress, // deprecated
    services, // 新的方式
};
```

## 内置服务

| 服务 ID         | 类型                | 用途               |
| --------------- | ------------------- | ------------------ |
| `storage`       | StorageService      | 图片上传、存储配置 |
| `counter`       | CounterService      | ID 生成计数器      |
| `callback`      | CallbackService     | 冲突处理、进度回调 |
| `presigned-url` | PresignedUrlService | 预签名 URL 转换    |

## 扩展服务

可以自定义服务并注册到 ServiceRegistry：

```typescript
import type { Service } from "@cmtx/publish";

interface MyServiceConfig {
    apiKey: string;
}

interface MyService extends Service<MyServiceConfig> {
    readonly id: "my-service";
    doSomething(): Promise<void>;
}

class MyServiceImpl implements MyService {
    readonly id = "my-service" as const;

    async initialize(config: MyServiceConfig): Promise<void> {
        // 初始化
    }

    async doSomething(): Promise<void> {
        // 实现
    }
}

// 注册
services.register(new MyServiceImpl());

// 使用
const myService = context.services.get<MyService>("my-service");
await myService?.doSomething();
```

## 优势

1. **核心稳定**: `CoreContext` 永不膨胀
2. **扩展灵活**: 新增能力通过实现 Service 接口
3. **依赖注入**: Rule 按需获取服务，不依赖具体实现
4. **类型安全**: TypeScript 泛型保证类型
5. **可测试**: 可单独 mock 每个 Service
