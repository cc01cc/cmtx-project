# ADR-010: 统一文件操作入口设计 - FileAccessor 模式

## 背景

当前项目中多个非应用层的 package 都能直接操作本地文件：

- **@cmtx/core** - 直接 fs 操作（筛选、替换、删除）
- **@cmtx/asset** - 已部分使用 `DocumentAccessor` 模式（Upload），但 Download/Transfer 仍直接 fs 操作
- **@cmtx/publish** - 直接 fs 操作（process-images、batch-process）

这导致：

- 文件操作逻辑分散在多个包中
- 难以统一控制文件操作行为（如缓存、权限、备份）
- 不利于单元测试（难以 mock 文件操作）
- 扩展困难（如支持远程文件系统或云存储）

## 决策

建立**统一的 FileAccessor 抽象层**，作为各 package 的文件操作入口。

### 核心架构

```
┌─────────────────────────────────────┐
│  应用层（cli、mcp-server、vscode）  │
│  直接调用各 package 的公共 API      │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  业务编排层（asset、publish）      │
│  通过 FileAccessor 读写文件         │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  基础层（core、storage）           │
│  通过 FileAccessor 进行文件操作     │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  FileAccessor（统一抽象）          │
│  - FileSystemAccessor（本地）      │
│ - MemoryAccessor（测试）           │
│ - 可扩展：CloudAccessor 等         │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  node:fs/promises（真实系统调用）   │
└─────────────────────────────────────┘
```

## 方案详情

### 1. 核心接口 - @cmtx/core/file-accessor

创建新包或模块：`@cmtx/core/file-accessor`

```typescript
// types.ts - 定义统一接口
export interface FileAccessor {
    /**
     * 读取文件内容
     * @throws FileNotFoundError 文件不存在
     * @throws PermissionError 无读权限
     */
    readText(path: string, encoding?: string): Promise<string>;

    /**
     * 读取文件为 Buffer
     */
    readBuffer(path: string): Promise<Buffer>;

    /**
     * 写入文件内容
     * @param createParents 是否创建父目录
     * @throws PermissionError 无写权限
     */
    writeText(
        path: string,
        content: string,
        options?: {
            createParents?: boolean;
            encoding?: string;
            backup?: boolean; // 写入前是否备份原文件
        },
    ): Promise<void>;

    /**
     * 写入 Buffer 到文件
     */
    writeBuffer(
        path: string,
        buffer: Buffer,
        options?: {
            createParents?: boolean;
            backup?: boolean;
        },
    ): Promise<void>;

    /**
     * 追加文本到文件（新增）
     */
    appendText(
        path: string,
        content: string,
        options?: {
            encoding?: string;
        },
    ): Promise<void>;

    /**
     * 复制文件（新增）
     */
    copyFile(
        src: string,
        dst: string,
        options?: {
            overwrite?: boolean;
        },
    ): Promise<void>;

    /**
     * 移动/重命名文件（新增）
     */
    moveFile(
        src: string,
        dst: string,
        options?: {
            overwrite?: boolean;
        },
    ): Promise<void>;

    /**
     * 删除文件
     * @throws FileNotFoundError 文件不存在
     * @throws PermissionError 无删除权限
     */
    deleteFile(
        path: string,
        options?: {
            force?: boolean; // 忽略 ENOENT 错误
        },
    ): Promise<void>;

    /**
     * 检查文件是否存在
     */
    exists(path: string): Promise<boolean>;

    /**
     * 获取文件信息
     */
    stat(path: string): Promise<FileStats>;

    /**
     * 列出目录内容
     */
    readdir(
        path: string,
        options?: {
            recursive?: boolean;
            filter?: (entry: DirEntry) => boolean;
            includeStats?: boolean;
        },
    ): Promise<DirEntry[]>;

    /**
     * 创建目录
     */
    mkdir(
        path: string,
        options?: {
            recursive?: boolean;
            mode?: number;
        },
    ): Promise<void>;

    /**
     * 可选：设置日志回调（用于诊断和审计）
     */
    setLogger?(logger: LoggerCallback): void;

    /**
     * 批量操作（事务性）
     */
    batch(): BatchOperation;
}

export interface DirEntry {
    name: string;
    path: string;
    isDirectory: boolean;
    isFile: boolean;
}

export interface FileStats {
    size: number;
    isFile: boolean;
    isDirectory: boolean;
    mtime: Date;
    ctime: Date;
}

export interface BatchOp {
    type: "read" | "write" | "delete" | "mkdir";
    path: string;
    content?: string;
    options?: any;
}

export interface BatchOperationResult {
    op: BatchOp;
    status: "success" | "error";
    result?: any;
    error?: Error;
}

export interface BatchOperation {
    add(op: BatchOp): BatchOperation;
    execute(options?: {
        atomic?: boolean; // 原子性要求
        rollbackOnError?: boolean; // 出错时回滚
    }): Promise<BatchOperationResult[]>;
    rollback(): Promise<void>; // 回滚（MemoryAccessor 完全支持，FileSystemAccessor 受限）
}
```

### 2. 错误处理（新增）

```typescript
// file-accessor-errors.ts
/**
 * 统一的文件操作错误基类
 */
export class FileAccessorError extends Error {
    constructor(
        message: string,
        public code: string, // 兼容 Node.js: 'ENOENT', 'EACCES', 'EISDIR' 等
        public path?: string,
        public cause?: Error,
    ) {
        super(message);
        this.name = "FileAccessorError";
    }
}

export class FileNotFoundError extends FileAccessorError {
    constructor(path: string, cause?: Error) {
        super(`File not found: ${path}`, "ENOENT", path, cause);
        this.name = "FileNotFoundError";
    }
}

export class PermissionError extends FileAccessorError {
    constructor(path: string, operation: string, cause?: Error) {
        super(`Permission denied for ${operation} on ${path}`, "EACCES", path, cause);
        this.name = "PermissionError";
    }
}

export class IsDirectoryError extends FileAccessorError {
    constructor(path: string) {
        super(`Is a directory: ${path}`, "EISDIR", path);
        this.name = "IsDirectoryError";
    }
}

export class NotDirectoryError extends FileAccessorError {
    constructor(path: string) {
        super(`Not a directory: ${path}`, "ENOTDIR", path);
        this.name = "NotDirectoryError";
    }
}
```

### 3. 实现

#### 文件系统实现 - FileSystemAccessor

````typescript
// file-system-accessor.ts
export class FileSystemAccessor implements FileAccessor {
  private logger?: LoggerCallback;

  setLogger(logger: LoggerCallback): void {
    this.logger = logger;
  }

  async readText(path: string, encoding = 'utf-8'): Promise<string> {
    this.logger?.('debug', `Reading file: ${path}`);
    try {
      const content = await readFile(path, 'utf-8');
      this.logger?.('debug', `Successfully read ${path} (${content.length} bytes)`);
      return content;
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      this.logger?.('error', `Failed to read ${path}`, { error });
      if (err.code === 'ENOENT') {
        throw new FileNotFoundError(path, err);
      }
      if (err.code === 'EACCES') {
        throw new PermissionError(path, 'read', err);
      }
      throw error;
    }
  }

  async writeText(path: string, content: string, options = {}): Promise<void> {
    const { createParents = true, encoding = 'utf-8', backup = false } = options;

    this.logger?.('debug', `Writing file: ${path}`);

    if (createParents) {
      await mkdir(dirname(path), { recursive: true });
    }

    // 可选备份
    if (backup && await this.exists(path)) {
      const backupPath = `${path}.backup.${Date.now()}`;
      this.logger?.('debug', `Backing up ${path} to ${backupPath}`);
      await copyFile(path, backupPath);
    }

    await writeFile(path, content, encoding);
    this.logger?.('debug', `Successfully wrote ${path}`);
  }

  async appendText(path: string, content: string, options = {}): Promise<void> {
    const { encoding = 'utf-8' } = options;
    this.logger?.('debug', `Appending to file: ${path}`);
    await appendFile(path, content, encoding);
  }

  async copyFile(src: string, dst: string, options = {}): Promise<void> {
    const { overwrite = false } = options;
    this.logger?.('debug', `Copying ${src} to ${dst}`);

    if (!overwrite && await this.exists(dst)) {
      throw new Error(`File already exists: ${dst}`);
    }

    await copyFile(src, dst);
  }

  async moveFile(src: string, dst: string, options = {}): Promise<void> {
    const { overwrite = false } = options;
    this.logger?.('debug', `Moving ${src} to ${dst}`);

    if (!overwrite && await this.exists(dst)) {
      throw new Error(`File already exists: ${dst}`);
    }

    await rename(src, dst);
  }

  async deleteFile(path: string, options = {}): Promise<void> {
    const { force = false } = options;
    this.logger?.('debug', `Deleting file: ${path}`);
    try {
      await unlink(path);
    } catch (error) {
      if (force && (error as NodeJS.ErrnoException).code === 'ENOENT') {
        return;
      }
      throw error;
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      await stat(path);
      return true;
    } catch {
      return false;
    }
  }

  async stat(path: string): Promise<FileStats> {
    const stats = await stat(path);
    return {
      size: stats.size,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      mtime: stats.mtime,
      ctime: stats.ctime,
    };
  }

  batch(): BatchOperation {
    return new FileSystemBatchOperation(this);
  }
}```
````

#### 测试实现 - MemoryAccessor

```typescript
// memory-accessor.ts
export class MemoryAccessor implements FileAccessor {
    private files: Map<string, Buffer> = new Map();
    private backups: Map<string, Buffer> = new Map(); // 用于 rollback
    private logger?: LoggerCallback;

    setLogger(logger: LoggerCallback): void {
        this.logger = logger;
    }

    async readText(path: string): Promise<string> {
        const buffer = this.files.get(path);
        if (!buffer) throw new FileNotFoundError(path);
        return buffer.toString("utf-8");
    }

    async writeText(path: string, content: string, options = {}): Promise<void> {
        const { backup = false } = options;

        // 可选备份
        if (backup && this.files.has(path)) {
            this.backups.set(path, this.files.get(path)!);
        }

        this.files.set(path, Buffer.from(content, "utf-8"));
    }

    async copyFile(src: string, dst: string): Promise<void> {
        const buffer = this.files.get(src);
        if (!buffer) throw new FileNotFoundError(src);
        this.files.set(dst, Buffer.from(buffer));
    }

    async moveFile(src: string, dst: string): Promise<void> {
        const buffer = this.files.get(src);
        if (!buffer) throw new FileNotFoundError(src);
        this.files.set(dst, buffer);
        this.files.delete(src);
    }

    async deleteFile(path: string): Promise<void> {
        this.files.delete(path);
    }

    // rollback 支持（MemoryAccessor 特有）
    async rollback(): Promise<void> {
        for (const [path, buffer] of this.backups.entries()) {
            this.files.set(path, buffer);
        }
        this.backups.clear();
        this.logger?.("info", "Rolled back all changes");
    }

    // ... 其他实现
}
```

### 4. 与现有设计的集成（新增）

#### DocumentAccessor 的定位

现有的 `DocumentAccessor` (@cmtx/asset/upload) 与新的 `FileAccessor` 关系如下：

```typescript
// 明确的继承关系
export interface DocumentAccessor extends FileAccessor {
    /**
     * 文档的唯一标识（文件路径）
     */
    readonly identifier: string;

    /**
     * 特化操作：对文档应用替换操作
     */
    applyReplacements(ops: ReplacementOp[]): Promise<boolean>;
}

// 实现关系
export class FileDocumentAccessor extends FileSystemAccessor implements DocumentAccessor {
    constructor(private readonly filePath: string) {
        super();
    }

    get identifier(): string {
        return this.filePath;
    }

    async readText(): Promise<string> {
        return super.readText(this.filePath);
    }

    async applyReplacements(ops: ReplacementOp[]): Promise<boolean> {
        const content = await this.readText();
        const updatedContent = applyOps(content, ops);
        await this.writeText(this.filePath, updatedContent);
        return true;
    }
}
```

**关键点：**

- ✅ `DocumentAccessor` 继承 `FileAccessor`，避免重复定义
- ✅ `DocumentAccessor` 是 **特化的** `FileAccessor`（针对特定文档）
- ✅ 保持现有 API 不变，通过继承关系扩展能力

### 5. 迁移策略

#### Phase 0: 基础设施建设（1 天）

**目标：** 创建 FileAccessor 模块的基础结构和测试框架

- 创建 `packages/core/src/file-accessor/` 目录结构
- 实现 `types.ts` - 完整的接口定义
- 实现 `file-accessor-errors.ts` - 错误类层级
- 实现 `file-system-accessor.ts` 和 `memory-accessor.ts`
- 创建上下文管理器 `FileAccessorContext`
- 编写 50+ 单元测试

**输出物：**

- ✅ `@cmtx/core/file-accessor` 模块可用
- ✅ >90% 代码覆盖率
- ✅ 完整的 TypeScript 类型定义

#### Phase 1: 基础层迁移（@cmtx/core）

**当前代码（直接 fs）：**

```typescript
export async function filterImagesFromFile(fileAbsPath: string) {
    const content = await readFile(fileAbsPath, "utf-8");
    // ...
}
```

**迁移后：**

```typescript
import { getDefaultFileAccessor } from "@cmtx/core/file-accessor";

export async function filterImagesFromFile(
    fileAbsPath: string,
    options?: { accessor?: FileAccessor },
) {
    const accessor = options?.accessor || getDefaultFileAccessor();
    const content = await accessor.readText(fileAbsPath);
    // ...
}
```

**向后兼容：** 默认返回 `FileSystemAccessor`，用户可注入自定义实现。

#### Phase 2: 中层迁移（@cmtx/asset）（2-3 天，可并行）

**并行任务：**

- **2a: Download** - 将 `fs/promises` 调用改为 `FileAccessor`
- **2b: Upload** - DocumentAccessor 改为继承 FileAccessor 体系
- **2c: Transfer** - 统一文件读写入口

**Note：** 三个子模块可并行迁移，无依赖冲突

#### Phase 3: 高层迁移（@cmtx/publish）（1-2 天）

- **3a: process-images** - 使用注入的 `FileAccessor`
- **3b: batch-process** - 改为 `DirectoryProcessor`（基于 FileAccessor）

#### Phase 4: 验收和优化（1 天）

- 集成测试
- 性能基准测试
- 文档更新
- 可选：性能优化层（CachedFileAccessor）

### 6. 上下文管理器 - FileAccessorContext

```typescript
// context.ts
export class FileAccessorContext {
    private static default: FileAccessor = new FileSystemAccessor();
    private static stack: FileAccessor[] = [];

    static setDefault(accessor: FileAccessor): void {
        this.default = accessor;
    }

    static getDefault(): FileAccessor {
        return this.default;
    }

    /**
     * 临时切换 Accessor（用于测试或特定操作）
     */
    static async use<T>(accessor: FileAccessor, fn: () => Promise<T>): Promise<T> {
        this.stack.push(accessor);
        try {
            return await fn();
        } finally {
            this.stack.pop();
        }
    }

    static getCurrent(): FileAccessor {
        return this.stack[this.stack.length - 1] || this.default;
    }
}
```

### 7. 性能优化（可选）

#### CachedFileAccessor 装饰器

```typescript
// cached-file-accessor.ts
export class CachedFileAccessor implements FileAccessor {
    private cache = new Map<string, { content: string; timestamp: number }>();

    constructor(
        private delegate: FileAccessor,
        private ttl: number = 5000, // 默认 5 秒缓存
    ) {}

    async readText(path: string, encoding?: string): Promise<string> {
        const cached = this.cache.get(path);
        if (cached && Date.now() - cached.timestamp < this.ttl) {
            return cached.content; // 返回缓存
        }

        const content = await this.delegate.readText(path, encoding);
        this.cache.set(path, { content, timestamp: Date.now() });
        return content;
    }

    // writeText 时使缓存失效
    async writeText(path: string, content: string, options?: any): Promise<void> {
        this.cache.delete(path);
        return this.delegate.writeText(path, content, options);
    }

    clearCache(): void {
        this.cache.clear();
    }

    // ... 其他代理方法
}

// 使用示例
const cached = new CachedFileAccessor(new FileSystemAccessor());
FileAccessorContext.setDefault(cached);
```

**收益：** 避免重复读取相同文件（如 filterImages 场景），性能提升 20-40%

### 8. 使用示例

**测试中注入 MemoryAccessor：**

```typescript
const memoryAccessor = new MemoryAccessor();
await memoryAccessor.writeText("/docs/test.md", "# Test");

await FileAccessorContext.use(memoryAccessor, async () => {
    const images = await filterImagesFromFile("/docs/test.md");
    expect(images).toEqual([]);
});
```

**应用层设置默认 Accessor：**

```typescript
// cli/index.ts
const accessor = new FileSystemAccessor({ backupDir: "./.cmtx-backup" });
FileAccessorContext.setDefault(accessor);

// 所有后续调用都使用这个 accessor
const result = await uploadLocalImageInMarkdown("./article.md", config);
```

## 优势

|     方面      |     现状     |         改进后          |
| :-----------: | :----------: | :---------------------: |
| **可测试性**  |  难以 mock   |  ✅ 易于注入测试 mock   |
| **职责清晰**  |  分散在各包  |       ✅ 统一入口       |
|  **扩展性**   |  每个包独立  |   ✅ 支持云存储等扩展   |
| **备份/审计** | 无法统一控制 | ✅ 可在 Accessor 中实现 |
| **性能优化**  |   难以缓存   |   ✅ 可加入文件缓存层   |
| **错误处理**  |     混乱     |    ✅ 统一的错误类型    |

## 实施步骤（详细）

### Phase 0: 基础设施（1 天）

1. 创建目录结构 `packages/core/src/file-accessor/`
2. 实现 5 个文件：
    - `types.ts` - 完整接口定义（包括 FileAccessor、DirEntry、FileStats、BatchOperation 等）
    - `file-accessor-errors.ts` - 错误类定义（FileAccessorError、FileNotFoundError 等）
    - `file-system-accessor.ts` - 文件系统实现（包含日志支持）
    - `memory-accessor.ts` - 测试实现（支持 rollback）
    - `context.ts` - 上下文管理器
3. 编写 50+ 单元测试
4. 生成 TypeScript 类型文档

### Phase 1: 迁移 @cmtx/core（2-3 天）

1. **改造 filter.ts**
    - filterImagesFromFile：添加 `options?: { accessor?: FileAccessor }`
    - filterImagesFromDirectory：同上
    - 后向兼容：默认使用 FileSystemAccessor

2. **改造 replace.ts**
    - replaceImagesInFile：添加 accessor 参数
    - replaceImagesInDirectory：同上
    - 测试：验证文件操作通过 accessor

3. **改造 delete.ts**
    - deleteLocalImage：使用 accessor
    - DeleteStrategy 改为使用 accessor
    - 集成 FileAccessor 的错误处理

4. **更新导出**
    - `packages/core/src/index.ts` 导出 FileAccessor 接口和默认实现
    - 更新 README 文档

### Phase 2: 迁移 @cmtx/asset（2-3 天，三个子任务并行）

**Task 2a: 迁移 Download 模块**

- 替换 `fs.readFile` 和 `fs.mkdir` 为 `FileAccessor` 调用
- 添加 `options?: { accessor?: FileAccessor }` 参数
- 编写测试

**Task 2b: 迁移 Upload 模块**

- DocumentAccessor 改为继承 FileAccessor
- FileDocumentAccessor 扩展 FileSystemAccessor
- 测试迁移

**Task 2c: 迁移 Transfer 模块**

- 替换文件操作为 accessor 调用
- 确保文件复制、移动操作使用 accessor
- 测试

### Phase 3: 迁移 @cmtx/publish（1-2 天）

1. **process-images.ts**
    - 将 readFile/writeFile/unlink 改为 accessor 调用
    - 添加 `options?: { accessor?: FileAccessor }`

2. **batch-process.ts**
    - adaptFile/validateFile 改为使用 accessor
    - adaptDirectory/validateDirectory 同上
    - 支持批量操作的 accessor 使用

### Phase 4: 验收和优化（1 天）

1. 集成测试（所有包联动）
2. 性能基准测试对比
3. 文档更新
4. 可选：实施 CachedFileAccessor

## 成本

- **开发时间**：约 9-14 天（包含 Phase 0）
    - Phase 0:1 天
    - Phase 1:2-3 天
    - Phase 2:2-3 天（三个子模块可并行）
    - Phase 3:1-2 天
    - Phase 4:1 天
- **测试覆盖**：需补充 100+ 个新的单元测试（包括错误处理、日志、batch 操作）
- **破坏性变更**：无（通过默认参数维持向后兼容）
- **可选优化**：CachedFileAccessor（+0.5 天）

## 关键改进点总结

相比初版设计，此版本增加了：

|     改进项     | 内容                             | 收益                   |
| :------------: | :------------------------------- | :--------------------- |
| **接口完整性** | 补充 copy/move/append 操作       | 支持更多文件操作场景   |
|  **错误处理**  | 定义完整的错误类层级             | 上层代码可精确处理错误 |
|  **日志集成**  | FileAccessor 支持 LoggerCallback | 统一诊断和审计日志     |
|  **设计集成**  | 明确 DocumentAccessor 继承关系   | 避免重复定义           |
|  **批量操作**  | BatchOperation 简化实现          | 初期稳定可靠           |
|  **性能优化**  | 可选的 CachedFileAccessor        | 20-40% 性能提升        |
|  **实施路线**  | 细化为 4 个 Phase                | 更易执行和跟踪         |

## 结论

引入统一的 **FileAccessor 模式** 是提升代码质量、可测试性和可维护性的关键决策。此版本融合了详细的评审意见，**架构更完整、实施更清晰、风险更低**。

建议优先实施，为后续的扩展和优化奠定坚实基础。
