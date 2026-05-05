# DEV-004: 编辑器未保存状态与文档操作

## 1. 问题背景

CMTX 的核心功能是对 Markdown 文档中的图片进行操作（上传、删除、转移等）。这些操作需要**读取、解析、修改**文档内容，然后将结果写回。

关键问题在于：**编辑器中打开的文件，其内存中的内容可能与磁盘上的内容不一致**。

## 2. 场景分析

### 2.1. 内容不一致的来源

| 场景 | 编辑器内存 | 磁盘文件 |
|---|---|---|
| 用户编辑但未保存 | 包含新编辑内容 | 旧版本 |
| 上游操作已修改文档 | 可能未自动同步 | 已更新 |
| 文件被外部工具修改 | 旧内容 | 新内容 |

### 2.2. 典型故障模式

用户报告的真实案例：

```
1. 用户在 VS Code 中编辑文档，添加了一些文本
2. 用户选中一块包含本地图片的区域，执行上传
3. 上传管道读取磁盘文件（旧版本，不包含新编辑的内容）
4. 选区的偏移量在磁盘文件中对应的是完全不同的内容
5. 结果：upload 0，用户困惑
```

更详细的场景：
- 上传操作将 `![alt](local.png)` 替换为 `<img src="https://...">` (长度从 ~24 变 ~90)
- 用户继续编辑，添加新图片引用
- 再次上传时，选区的 offset 在磁盘文件中指向已上传的 HTML 标签
- 管道扫描到的是已上传的图片，跳过 → 上传 0

## 3. 核心原则

### 原则 1：编辑器操作必须读取编辑器内存

当用户在 VS Code 中操作时（选中文本、执行命令），所有文件读取必须通过编辑器 API（`editor.document.getText()`）获取当前内容，包括未保存的更改。

### 原则 2：非编辑器操作可以读取磁盘

CLI、MCP Server 等非交互式工具没有"编辑器内存"的概念，读取磁盘文件是正确行为。

### 原则 3：写回必须使用正确的 API

- **VS Code 环境**：使用 `TextEditorEdit` API 写入（支持 undo/redo）
- **CLI/MCP Server 环境**：使用 `fs.writeFile` 写入磁盘

## 4. 架构方案：FileAccessor

### 4.1. 设计模式

通过 `FileAccessor` 接口抽象文档读写操作，提供不同实现：

```
FileAccessor (接口)
├── FsFileAccessor      → 读写磁盘文件（CLI、MCP Server 使用）
└── VSCodeFileAccessor  → 读写编辑器内存，感知未保存内容（VS Code 使用）
```

### 4.2. VSCodeFileAccessor 实现要点

```typescript
class VSCodeFileAccessor implements FileAccessor {
    readText(path: string): Promise<string> {
        // 遍历已打开的文档，匹配文件路径
        const doc = vscode.workspace.textDocuments
            .find(d => d.uri.fsPath === path);
        if (doc) {
            return doc.getText();  // 编辑器内存版本，包含未保存修改
        }
        return fs.readFile(path, "utf-8");  // 磁盘版本
    }

    writeText(path: string, content: string): Promise<void> {
        const doc = vscode.workspace.textDocuments
            .find(d => d.uri.fsPath === path);
        if (doc) {
            const edit = new vscode.WorkspaceEdit();
            const fullRange = new vscode.Range(
                doc.positionAt(0),
                doc.positionAt(doc.getText().length),
            );
            edit.replace(doc.uri, fullRange, content);
            return vscode.workspace.applyEdit(edit) as Promise<void>;
        }
        return fs.writeFile(path, content, "utf-8") as Promise<void>;
    }
}
```

### 4.3. FileAccessor 在上传中的使用

```typescript
// publishAndReplaceFile 接受 FileAccessor，库包层不关心具体实现
import { publishAndReplaceFile } from "@cmtx/rule-engine/node";
import { VSCodeFileAccessor } from "../infra/vscode-file-accessor.js";

const accessor = new VSCodeFileAccessor();
await publishAndReplaceFile(filePath, config, accessor);
// accessor 在库包内部用于 readText/writeText
```

## 5. 开发指南

### 5.1. 新增操作时的检查清单

在实现新的文档操作功能时，必须检查：

- [ ] 这个操作是否可能在编辑器环境中执行？
- [ ] 如果是，当前使用的 `DocumentAccessor` 是什么类型？
- [ ] 能否正确读取编辑器内存中的未保存内容？
- [ ] 写回文档时是否使用了编辑器 API（而非直接 `fs.writeFile`）？
- [ ] 偏移量计算是否基于正确的文档内容？

### 5.2. 常见错误

| 错误 | 后果 | 正确做法 |
|---|---|---|
| VS Code 中使用 `FsFileAccessor` | 读取磁盘旧内容，操作失败或结果错误 | 使用 `VSCodeFileAccessor` |
| CLI 中尝试使用 VSCode API | 运行时错误 | 使用 `FsFileAccessor`（默认） |
| 在库包内部硬编码 `fs.readFile` | 无法支持编辑器未保存状态 | 通过 `FileAccessor` 注入 |

### 5.3. 层职责

| 层 | 职责 | 文件访问方式 |
|---|---|---|
| VS Code 扩展 (`cmtx-vscode`) | 创建 `VSCodeFileAccessor` 并传递给库包函数 | `editor.document.getText()` 或 `vscode.workspace.textDocuments.find()` |
| 资产层 (`@cmtx/asset`) | 通过 `FileAccessor` 接口读写，不关心实现 | 抽象接口 |
| CLI (`@cmtx/cli`) | 使用 `FsFileAccessor`（默认） | `fs.readFile` |
| MCP Server (`@cmtx/mcp-server`) | 使用 `FsFileAccessor`（默认） | `fs.readFile` |

## 6. 未保存状态对图片操作的具体影响

### 6.1. 上传

- **受影响**：是（最严重）
- **原因**：上传需要扫描文档中的图片引用、计算替换偏移量
- **已实现**：VSCodeFileAccessor，所有上传路径（`publishAndReplaceFile`、`uploadAndReplaceFile`、`batchUploadImages`）均接受 `FileAccessor` 参数

### 6.2. 删除（safe-delete）

- **受影响**：是
- **原因**：safe-delete 需要读取文档中图片引用进行引用检查
- **当前状态**：待确认是否使用编辑器内存

### 6.3. 转移

- **受影响**：是
- **原因**：转移后需要替换文档中的图片引用
- **当前状态**：待确认

### 6.4. 发布

- **受影响**：是
- **原因**：发布前需要处理文档中的图片
- **当前状态**：待确认

## 7. 测试策略

### 7.1. MemoryDocumentAccessor

测试中使用 `MemoryDocumentAccessor` 模拟编辑器内存状态：

```typescript
// 在测试中构造 MemoryDocumentAccessor
const accessor = new MemoryDocumentAccessor();
accessor.setContent("# Test\n\n![img](local.png)");

// 模拟未保存的编辑
accessor.setContent("# Test\n\n111![img](local.png)222");

// 执行操作，验证 accessor 中的内容是正确的最新版本
const result = await uploadImages({ documentAccessor: accessor });
expect(result.uploaded).toBe(1);
```

### 7.2. 必须覆盖的场景

- 文件已保存但未修改 → 基本流程正常
- 文件已修改但未保存 → 操作基于最新内容
- 文件被多次编辑 → 每次操作的偏移量基于当前内容
- 文件在上次操作后被外部修改 → 确认同步行为

## 8. 相关文档

- [架构决策记录：统一文件操作入口设计](./adr/ADR-010-unified-file-accessor-pattern.md) - FileAccessor 模式架构
- [开发指南](./DEV-001-development_guide.md) - 通用开发流程
