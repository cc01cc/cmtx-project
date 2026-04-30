# VS Code 扩展开发调试指南 - DevContainer 特殊考虑

## 1. DevContainer 中 Profile 机制的特殊性

### 1.1 本地 Windows vs DevContainer 的扩展管理差异

| 维度             | 本地 Windows            | DevContainer                            |
| ---------------- | ----------------------- | --------------------------------------- |
| **扩展安装位置** | `~/.vscode/extensions/` | `/home/node/.vscode-server/extensions/` |
| **扩展管理**     | Profile 控制            | `devcontainer.json` 控制                |
| **Profile 存储** | 本地                    | 容器内                                  |
| **扩展安装时机** | 手动/Profile 切换       | 容器启动时强制安装                      |

### 1.2 核心机制：devcontainer.json 的扩展是\"强制\"安装的

**本地 Windows 的 Profile 机制**：

```
Profile "Default"
    └── 扩展列表：[A, B, C]
            └── 安装到 ~/.vscode/extensions/

Profile "PURE"
    └── 扩展列表：[A]
            └── 安装到 ~/.vscode/extensions/

切换 Profile 时：
    └── 只加载该 Profile 的扩展
    └── 其他扩展被禁用
```

**DevContainer 的扩展机制**：

```json
// .devcontainer/devcontainer.json
{
    "customizations": {
        "vscode": {
            "extensions": ["A", "B", "C", "D", "E"]
        }
    }
}
```

**容器启动流程**：

```
1. DevContainer 插件读取 devcontainer.json
        │
2. 强制安装所有列出的扩展
        │
        └── 安装到 /home/node/.vscode-server/extensions/
                │
3. Profile 配置
        │
        └── 只能控制\"启用\"哪些扩展
                │
                └── 但所有扩展都已经安装在容器中了！
```

### 1.3 两类扩展的区别

当你查看 DevContainer 中的扩展列表时，会看到两类扩展：

| 类型                               | 来源              | 是否受 Profile 控制 |
| ---------------------------------- | ----------------- | ------------------- |
| **LOCAL - INSTALLED**              | Profile 配置      | 是                  |
| **DEV CONTAINER: XXX - INSTALLED** | devcontainer.json | **否**（强制安装）  |

**问题**：即使 Profile 禁用了某些扩展，它们仍然**安装**在容器中，并且可能被 Extension Host 加载。

---

## 2. 为什么 Extension Development Host 也加载所有扩展？

### 2.1 架构图

```
┌─────────────────────────────────────────────────────────┐
│         DevContainer (同一个容器)                        │
│                                                         │
│  /home/node/.vscode-server/extensions/                 │
│  ├── A (DEV CONTAINER - 强制安装)                       │
│  ├── B (DEV CONTAINER - 强制安装)                       │
│  ├── C (DEV CONTAINER - 强制安装)                       │
│  ├── D (DEV CONTAINER - 强制安装)                       │
│  └── E (DEV CONTAINER - 强制安装)                       │
│                                                         │
│  Extension Host 1 (Host VS Code)                        │
│  └── 加载所有扩展 (A, B, C, D, E)                       │
│                                                         │
│  Extension Host 2 (Extension Development Host)          │
│  └── 也加载所有扩展 (A, B, C, D, E)                     │
└─────────────────────────────────────────────────────────┘
```

### 2.2 关键概念

| 概念                    | 说明                                               |
| ----------------------- | -------------------------------------------------- |
| **DevContainer 数量**   | 只有 **一个**                                      |
| **VS Code 窗口数量**    | 两个（Host 和 Dev Host）                           |
| **Extension Host 数量** | 两个（共用同一个 DevContainer）                    |
| **扩展安装位置**        | 同一个目录 `/home/node/.vscode-server/extensions/` |
| **扩展加载**            | 两个窗口都会加载所有扩展                           |

### 2.3 为什么不能通过 Profile 隔离？

**根本原因**：

| 层级         | 本地             | DevContainer                         |
| ------------ | ---------------- | ------------------------------------ |
| **扩展安装** | Profile 控制     | devcontainer.json 控制（强制）       |
| **扩展启用** | Profile 控制     | Profile 控制                         |
| **实际效果** | 只安装启用的扩展 | 所有扩展都安装，Profile 只能控制启用 |

---

## 3. 解决方案对比

### 3.1 方案对比表

| 方案                        | 说明                   | 优点               | 缺点                           |
| --------------------------- | ---------------------- | ------------------ | ------------------------------ |
| **修改 devcontainer.json**  | 减少强制安装的扩展数量 | 从根本上减少扩展   | 影响所有开发场景               |
| **使用独立的 DevContainer** | 创建专门的扩展开发环境 | 完全隔离           | 需要管理多个容器               |
| **使用 OutputChannel**      | 接受现状，隔离日志输出 | 简单，无需配置变更 | Debug Console 仍有其他扩展输出 |

### 3.2 方案 1：修改 devcontainer.json

**修改内容**：

```json
{
    "customizations": {
        "vscode": {
            "extensions": [
                // 只保留绝对必要的扩展
                "dbaeumer.vscode-eslint",
                "esbenp.prettier-vscode"
                // 移除其他扩展，让它们通过 Profile 管理
            ]
        }
    }
}
```

**影响**：

- Host VS Code 和 Extension Development Host 都会加载更少的扩展
- 无法单独为 Extension Development Host 配置

**重建容器**：

```bash
# 在命令面板中
Dev Containers: Rebuild Container
```

### 3.3 方案 2：使用独立的 DevContainer

**创建两个 DevContainer 配置**：

```
workspace/
├── .devcontainer/
│   ├── devcontainer.json              # 主开发环境（所有扩展）
│   └── devcontainer.extension.json    # 扩展开发环境（最少扩展）
```

**使用方式**：

1. 打开第一个 VS Code 窗口 → 连接到 DevContainer A
2. 打开第二个 VS Code 窗口 → 连接到 DevContainer B
3. 在第二个窗口中 F5 调试扩展

**缺点**：

- 需要管理两个容器
- 复杂度增加

### 3.4 方案 3：使用 OutputChannel（推荐）

**原因**：

1. 最简单，无需修改配置
2. 不影响其他开发场景
3. 符合官方最佳实践

**实现方式**：

```typescript
// 你的扩展日志
const channel = vscode.window.createOutputChannel("CMTX");
channel.appendLine("Your message");

// Debug Console 中过滤
// 搜索 [CMTX]
```

**配合 Logger 使用**：

```typescript
// packages/vscode-extension/src/infra/logger.ts
export function getLogger(moduleName?: string): CmtxLogger {
    const baseLogger = getBaseLogger(moduleName);

    return new Proxy(baseLogger, {
        get(target, prop, receiver) {
            if (typeof prop === "string" && isLogMethod(prop)) {
                const method = Reflect.get(target, prop, receiver);
                if (typeof method === "function") {
                    const logMethod = method as (...args: unknown[]) => unknown;
                    return (...args: unknown[]) => {
                        appendToOutputChannel(prop, moduleName, args); // 输出到 OutputChannel
                        return logMethod.apply(target, args); // 输出到 Debug Console
                    };
                }
            }
            return Reflect.get(target, prop, receiver);
        },
    });
}
```

**注意事项**：

1. **添加前缀**：在日志中添加 `[CMTX]` 前缀，方便在 Debug Console 中过滤
2. **使用 OutputChannel**：用户可见的日志使用 OutputChannel
3. **接受现状**：Debug Console 会显示所有扩展的输出，这是 DevContainer 的正常行为

---

## 4. 总结

| 问题                                                  | 答案                                              |
| ----------------------------------------------------- | ------------------------------------------------- |
| 为什么 Profile 在 DevContainer 中效果不同？           | devcontainer.json 强制安装扩展，不受 Profile 控制 |
| 为什么 LOCAL 和 DEV CONTAINER 扩展都加载？            | 两者都在同一个容器中，都会被 Extension Host 加载  |
| Extension Development Host 需要 DevContainer 插件吗？ | **不需要**，它只是连接到已存在的 DevContainer     |
| devcontainer.json 中的扩展会全部加载吗？              | **是的**，全部加载                                |
| 如何解决 Debug Console 混杂的问题？                   | 使用 OutputChannel 隔离你的扩展日志               |

---

## 5. 参考文档

- [DEV-001-vscode_extension_debugging.md](./DEV-001-vscode_extension_debugging.md) - VS Code 扩展开发调试指南
- [VS Code Dev Containers Documentation](https://code.visualstudio.com/docs/devcontainers/containers)
- [VS Code Profiles](https://code.visualstudio.com/api/advanced-topics/remote-extensions)

---

_创建日期：2026-04-08_
