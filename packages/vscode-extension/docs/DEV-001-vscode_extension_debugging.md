# VS Code 扩展开发调试指南

## 1. 核心概念：两个 VS Code 窗口

在 VS Code 扩展开发中，存在两个不同的 VS Code 实例：

| 窗口                                     | 说明                                                                    |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| **Host VS Code** (原窗口)                | 编写扩展代码的 VS Code 实例，包含扩展源代码、launch.json 配置           |
| **Extension Development Host** (F5 打开) | 运行扩展的独立 VS Code 实例，通过 `--extensionDevelopmentPath` 加载扩展 |

当按下 F5 启动调试时，VS Code 会：

1. 编译扩展代码
2. 启动一个新的 VS Code 窗口 (Extension Development Host)
3. 在该窗口中加载正在开发的扩展

---

## 2. 调试面板详解

### 2.1 DEBUG CONSOLE (调试控制台)

| 属性         | 说明                                                                                                       |
| ------------ | ---------------------------------------------------------------------------------------------------------- |
| **位置**     | 底部面板，与 TERMINAL/OUTPUT 并列                                                                          |
| **作用**     | 1. 显示调试输出 (console.log 等)<br>2. **REPL 交互** - 可执行表达式、查看变量<br>3. 断点命中时的上下文信息 |
| **数据来源** | 被调试的程序/扩展的输出流                                                                                  |
| **特点**     | 支持语法高亮、自动补全、多行输入 (Shift+Enter)                                                             |
| **适用场景** | 调试时查看输出、动态执行代码、检查变量值                                                                   |

**关键配置**: 当 `launch.json` 使用 `"console": "internalConsole"` 时，`console.log` 会输出到 DEBUG CONSOLE。

**示例**:

```typescript
// 在扩展代码中
console.log("Extension activated");
console.log("Current document:", vscode.window.activeTextEditor?.document.fileName);
```

---

### 2.2 OUTPUT (输出面板)

| 属性         | 说明                                                          |
| ------------ | ------------------------------------------------------------- |
| **位置**     | 底部面板                                                      |
| **作用**     | 显示各种**通道 (channel)**的输出日志                          |
| **数据来源** | 扩展通过 `vscode.window.createOutputChannel()` 创建的专用通道 |
| **特点**     | 每个扩展可创建多个命名通道，用户可切换查看                    |
| **适用场景** | 扩展日志输出、长期运行的任务日志、非调试信息                  |

**代码示例**:

```typescript
const channel = vscode.window.createOutputChannel("MyExtension");
channel.appendLine("Extension activated");
channel.appendLine("Processing started...");

// 显示输出通道
channel.show();
```

**与 DEBUG CONSOLE 的区别**:

- OUTPUT 是扩展主动创建的日志通道
- DEBUG CONSOLE 是调试器捕获的输出

---

### 2.3 TERMINAL (集成终端)

| 属性         | 说明                                       |
| ------------ | ------------------------------------------ |
| **位置**     | 底部面板                                   |
| **作用**     | 运行 shell 命令、启动子进程                |
| **数据来源** | 外部命令、子进程 (如 npm、git、自定义 CLI) |
| **特点**     | 完整的 PTY 终端，支持交互式命令            |
| **适用场景** | 运行构建脚本、启动服务器、执行 CLI 工具    |

**代码示例**:

```typescript
const terminal = vscode.window.createTerminal("Build");
terminal.sendText("npm run build");
terminal.show();

// 执行命令并获取输出
const { exec } = require("child_process");
exec("git status", (error, stdout, stderr) => {
    console.log(stdout);
});
```

---

### 2.4 PORTS (端口面板)

| 属性         | 说明                                    |
| ------------ | --------------------------------------- |
| **位置**     | 底部面板 (Remote 开发时)                |
| **作用**     | 显示和管理**端口转发**                  |
| **数据来源** | 自动检测或手动配置的端口转发规则        |
| **特点**     | 支持本地端口与远程端口的映射            |
| **适用场景** | Remote-SSH/Container 开发时访问远程服务 |

**使用场景**:

- 在 Remote-SSH 环境中开发时，将远程服务器的端口映射到本地
- 调试 Web 应用时暴露服务端口

---

### 2.5 Developer Tools (Help > Toggle Developer Tools)

| 属性         | 说明                                               |
| ------------ | -------------------------------------------------- |
| **位置**     | 独立的 Chrome DevTools 窗口                        |
| **作用**     | 调试 **VS Code 本身的 UI** (Electron/Chromium)     |
| **数据来源** | VS Code 渲染进程的 DOM、网络请求、性能分析         |
| **特点**     | 类似浏览器 DevTools，可检查元素、查看网络、Profile |
| **适用场景** | 调试 WebView、检查 UI 问题、性能分析、查看网络请求 |

**关键区别**:

- DEBUG CONSOLE 调试的是**扩展代码逻辑** (Node.js 层)
- Developer Tools 调试的是**VS Code 自身的 UI 渲染** (Electron 层)

**扩展无法访问 VS Code 的 DOM** (安全限制), Developer Tools 主要用于：

- 调试 WebView 内容
- 检查 VS Code 自身的 UI 问题
- 性能分析
- 查看网络请求

---

## 3. 对比总结表

| 面板                | 调试目标   | 数据来源             | 交互性    | 典型用途               |
| ------------------- | ---------- | -------------------- | --------- | ---------------------- |
| **DEBUG CONSOLE**   | 扩展代码   | console.log / 调试器 | REPL 支持 | 断点调试、表达式求值   |
| **OUTPUT**          | 扩展日志   | OutputChannel API    | 只读      | 扩展运行日志、任务输出 |
| **TERMINAL**        | 外部进程   | Shell/子进程 stdout  | 完全交互  | 运行命令、构建、服务器 |
| **PORTS**           | 网络端口   | 端口转发配置         | 可配置    | 远程端口映射           |
| **Developer Tools** | VS Code UI | Electron/Chromium    | 元素检查  | WebView 调试、UI 问题  |

---

## 4. 扩展开发中的典型场景

| 场景                      | 使用面板        | 示例                            |
| ------------------------- | --------------- | ------------------------------- |
| 调试扩展代码，查看变量    | DEBUG CONSOLE   | 断点调试、console.log           |
| 输出扩展运行日志          | OUTPUT          | 创建 OutputChannel 记录操作日志 |
| 启动开发服务器            | TERMINAL        | 运行 npm run dev                |
| 调试 WebView 内容         | Developer Tools | 检查 WebView 中的 HTML/CSS      |
| Remote 开发时访问本地服务 | PORTS           | 端口转发 3000 -> localhost:3000 |

---

## 5. 调试配置示例

### 5.1 launch.json 配置

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Run Extension",
            "type": "extensionHost",
            "request": "launch",
            "args": ["--extensionDevelopmentPath=${workspaceFolder}"],
            "outFiles": ["${workspaceFolder}/dist/**/*.js"],
            "preLaunchTask": "${defaultBuildTask}",
            // 使用 internalConsole 将 console.log 输出到 DEBUG CONSOLE
            "console": "internalConsole"
        }
    ]
}
```

### 5.2 扩展中的日志输出最佳实践

```typescript
import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
    // 创建专用输出通道
    const outputChannel = vscode.window.createOutputChannel("CMTX");

    // 记录扩展激活
    outputChannel.appendLine(`[${new Date().toISOString()}] Extension activated`);

    // 注册命令
    const disposable = vscode.commands.registerCommand("cmtx.upload", async () => {
        outputChannel.appendLine(`[${new Date().toISOString()}] Upload command triggered`);

        try {
            // 执行上传逻辑
            const result = await performUpload();
            outputChannel.appendLine(`[${new Date().toISOString()}] Upload completed: ${result}`);
        } catch (error) {
            outputChannel.appendLine(`[${new Date().toISOString()}] Upload failed: ${error}`);
            console.error("Upload error:", error); // 同时输出到 DEBUG CONSOLE
        }
    });

    context.subscriptions.push(disposable);
    context.subscriptions.push(outputChannel);
}
```

---

## 6. 常见问题

### 6.1 console.log 输出到哪里？

取决于 `launch.json` 中的 `console` 配置：

- `"console": "internalConsole"` (默认) -> **Host VS Code 的 DEBUG CONSOLE**
- `"console": "integratedTerminal"` -> TERMINAL

**重要**：console.log 的输出在 **Host VS Code** 窗口的 DEBUG CONSOLE，而不是 Extension Development Host 窗口。

### 6.2 为什么 Extension Development Host 的 Debug Console 是空的？

因为 **调试器运行在 Host VS Code**，而不是 Extension Development Host：

| 窗口                           | 调试器位置       | DEBUG CONSOLE 状态              |
| ------------------------------ | ---------------- | ------------------------------- |
| **Host VS Code**               | 调试器在这里运行 | 显示所有扩展的 console.log 输出 |
| **Extension Development Host** | 只是被调试的目标 | **空的**（没有调试器）          |

### 6.3 如何调试 WebView?

1. 在 Extension Development Host 中打开 WebView
2. 使用 `Help > Toggle Developer Tools`
3. 在 Elements 面板中检查 WebView 内容
4. 在 Console 中查看 WebView 的 console.log

### 6.4 扩展可以访问 VS Code 的 DOM 吗？

**不可以**。VS Code 出于安全考虑，扩展无法访问主界面的 DOM。只能通过官方 API 进行 UI 扩展。

### 6.5 如果只使用 OutputChannel，DEBUG CONSOLE 还会有输出吗？

**不会**，DEBUG CONSOLE 中不会有输出。

`console.log()` 和 `outputChannel.appendLine()` 是两个**完全独立**的输出机制：

| 方式                         | 输出目标      | 说明                           |
| ---------------------------- | ------------- | ------------------------------ |
| `console.log()`              | DEBUG CONSOLE | Node.js 标准输出，被调试器捕获 |
| `outputChannel.appendLine()` | OUTPUT 面板   | VS Code API 专用通道           |

**示例对比**：

```typescript
// 这行会输出到 DEBUG CONSOLE
console.log("Debug message");

// 这行会输出到 OUTPUT 面板
outputChannel.appendLine("Output message");
```

**如果只使用 OutputChannel**：

```typescript
export function activate(context: vscode.ExtensionContext) {
    const channel = vscode.window.createOutputChannel("MyExt");

    // 只用 OutputChannel，不用 console.log
    channel.appendLine("Extension activated");
}
```

结果：

- OUTPUT 面板 → 有输出
- DEBUG CONSOLE → **无输出**（空的）

**推荐做法**：两者都用，或者根据场景选择

```typescript
export function activate(context: vscode.ExtensionContext) {
    const channel = vscode.window.createOutputChannel("MyExt");

    // 开发调试时用 console.log（DEBUG CONSOLE 可见）
    console.log("Extension activating...");

    // 用户可见的日志用 OutputChannel
    channel.appendLine("Extension activated");
    channel.show(); // 自动打开 OUTPUT 面板
}
```

**高级：重定向 console.log 到 OutputChannel**

可以统一输出到 OutputChannel：

```typescript
export function activate(context: vscode.ExtensionContext) {
    const channel = vscode.window.createOutputChannel("MyExt");

    // 重定向 console.log 到 OutputChannel
    const originalLog = console.log;
    console.log = (...args) => {
        const message = args.map((a) => String(a)).join(" ");
        channel.appendLine(`[LOG] ${message}`);
        // originalLog(...args); // 可选：同时保留 DEBUG CONSOLE 输出
    };

    console.log("这条会出现在 OUTPUT 面板");
    // DEBUG CONSOLE 不会有输出（除非取消注释 originalLog 那一行）
}
```

**总结**：

| 代码中使用                           | DEBUG CONSOLE        | OUTPUT 面板 |
| ------------------------------------ | -------------------- | ----------- |
| 只用 `console.log`                   | 有                   | 无          |
| 只用 `outputChannel.appendLine`      | **无**               | 有          |
| 两者都用                             | 有                   | 有          |
| 重定向 `console.log` → OutputChannel | 无（除非保留原输出） | 有          |

### 6.6 F5 调试时 Debug Console 输出在哪个窗口？

**重要澄清**：F5 启动调试后，Debug Console 的输出在 **Host VS Code**（原窗口），而不是 Extension Development Host。

#### 官方文档确认的内容

根据 [Your First Extension](https://code.visualstudio.com/api/get-started/your-first-extension)：

> "Inside the editor, open `src/extension.ts` and press F5... This will compile and run the extension in a new **Extension Development Host** window."

根据 [Debug code with Visual Studio Code](https://code.visualstudio.com/docs/debugtest/debugging)：

> "**Debug console**: enables viewing and interacting with the output of your code running in the debugger."

**官方文档明确确认**：

- F5 会打开一个新的 Extension Development Host 窗口
- Debug Console 显示调试输出

#### 基于实际观察的内容

**官方文档未明确说明**：Debug Console 的输出在哪个窗口。

以下内容基于调试架构推断和实际观察：

| 窗口                           | 调试器位置       | Debug Console                |
| ------------------------------ | ---------------- | ---------------------------- |
| **Host VS Code**               | 调试器在这里运行 | 显示被调试扩展的 console.log |
| **Extension Development Host** | 只是被调试的目标 | 空（没有调试器）             |

**架构图**：

```
Host VS Code                                    Extension Development Host
    │                                                    │
    ├── 调试器运行在这里                                  ├── 没有调试器
    ├── Debug Console 显示扩展输出                       ├── Debug Console 是空的
    └── 按 F5 启动调试                                   └── 扩展代码在这里执行
            │                                                    │
            └───────────── 调试协议传输 ───────────────────────────┘
```

**console.log 的流向**：

```
Extension Development Host 的 Extension Host
    │
    ├── 执行扩展代码
    ├── console.log(...)
    │
    └── 通过调试协议传输 ──────────> Host VS Code
                                        │
                                        └── Debug Console 显示
```

**为什么这样设计？**

| 原因           | 说明                                                          |
| -------------- | ------------------------------------------------------------- |
| **调试器隔离** | 调试器在 Host VS Code 中，不会影响 Extension Development Host |
| **方便调试**   | 调试器、断点、变量查看都在你熟悉的开发环境中                  |
| **输出集中**   | 所有调试输出在 Host VS Code 的 Debug Console，方便查看        |

### 6.7 Debug Console 显示的是所有扩展的输出

**重要**：Debug Console 显示的是 **整个 Extension Host 进程的所有输出**，不仅仅是正在开发的扩展。

#### 官方文档确认的内容

官方文档未明确说明此行为。

#### 基于实际观察的内容

以下内容基于实际调试环境的观察：

| 输出来源             | 示例                                         |
| -------------------- | -------------------------------------------- |
| **你正在开发的扩展** | `INFO [presigned-url] 初始化预签名 URL 功能` |
| **其他已启用的扩展** | `Kilo Code extension is now active`          |
| **Node.js 警告**     | `[DEP0040] DeprecationWarning`               |
| **VS Code 系统信息** | `[reconnection-grace-time] Extension host`   |

**架构图**：

```
Extension Development Host
    │
    └── Extension Host
            │
            ├── 你的扩展
            │   └── console.log("[CMTX] Your message")
            │
            ├── Kilo Code
            │   └── console.log("Kilo Code extension is now active")
            │
            ├── ESLint
            │   └── console.log(...)
            │
            └── 其他扩展...
                └── console.log(...)
                        │
                        └── 所有输出 ──> Host VS Code Debug Console
```

**如何区分你的扩展的输出？**

**方法 1：添加前缀**

```typescript
console.log("[CMTX] Your message here");
```

**方法 2：使用 OutputChannel（推荐）**

```typescript
const channel = vscode.window.createOutputChannel("CMTX");
channel.appendLine("Your message here");
```

这样你的扩展日志会出现在 **OUTPUT 面板的 CMTX 通道**，而不是 Debug Console，完全隔离其他扩展的输出。

**总结**：

| 问题                               | 答案                                       |
| ---------------------------------- | ------------------------------------------ |
| Debug Console 只显示你开发的扩展？ | **否**，显示整个 Extension Host 的所有输出 |
| 如何区分你的扩展输出？             | 添加前缀或使用 OutputChannel               |
| 这会影响调试吗？                   | 不影响，但可能需要过滤查看                 |

---

## 7. 官方推荐与设计哲学

### 7.1 核心原则

| 面板              | 设计目的           | 官方推荐用途                     |
| ----------------- | ------------------ | -------------------------------- |
| **OutputChannel** | **用户可见的日志** | 扩展运行状态、操作结果、错误信息 |
| **Debug Console** | **开发调试信息**   | 开发阶段的调试输出、临时检查     |

> 官方文档强调：OutputChannel 是"readonly textual information"的容器，用于向用户展示信息。

### 7.2 官方扩展的实践参考

微软官方扩展的日志实现方式：

| 扩展                | 日志实现                        | 特点                   |
| ------------------- | ------------------------------- | ---------------------- |
| **vscode-python**   | 自定义 Logger (6 文件, 322 LoC) | 支持日志级别、模块分层 |
| **vscode-cpptools** | 单文件 Logger (141 LoC)         | 相对简单，但功能完整   |
| **prettier-vscode** | 简单 Logger (74 LoC)            | 社区推荐的简洁实现     |

**关键发现**：官方扩展**主要使用 OutputChannel**，`console.log` 仅用于开发调试。

### 7.3 LogOutputChannel API (VS Code 1.74+)

2022 年 11 月发布的 VS Code 1.74 引入了官方推荐的日志方案：

```typescript
// 创建带日志级别的 OutputChannel
const logChannel = vscode.window.createOutputChannel("MyExtension", { log: true });

// 使用不同级别记录日志
logChannel.trace("Detailed trace info");
logChannel.debug("Debug information");
logChannel.info("General information");
logChannel.warn("Warning message");
logChannel.error("Error occurred", error);
```

**优势**：

- 支持日志级别（trace/debug/info/warn/error）
- 用户可通过设置控制日志级别
- 统一格式，自动包含时间戳
- 与 VS Code 的日志系统集成

### 7.4 输出内容设计建议

#### OutputChannel 应该输出什么？

| 内容类型         | 示例                                 | 说明               |
| ---------------- | ------------------------------------ | ------------------ |
| 扩展生命周期事件 | "Extension activated"                | 用户知道扩展已启动 |
| 命令执行结果     | "Upload complete: 5 images uploaded" | 操作反馈           |
| 错误信息         | "Upload failed: network timeout"     | 清晰的错误描述     |
| 配置变更         | "Configuration updated"              | 状态变化通知       |
| 长时间操作进度   | "Processing... (3/10)"               | 进度反馈           |

#### Debug Console 应该输出什么？

| 内容类型     | 示例                                   | 说明         |
| ------------ | -------------------------------------- | ------------ |
| 开发调试信息 | `console.log('Debug: value =', value)` | 临时检查变量 |
| 断点调试     | 断点处查看变量                         | 交互式调试   |
| 性能分析     | `console.time('operation')`            | 测量执行时间 |
| 临时测试代码 | 快速验证代码逻辑                       | 开发阶段使用 |

### 7.5 推荐设计模式

#### 模式 1：统一 Logger 封装（推荐）

```typescript
// logger.ts
import * as vscode from "vscode";

class Logger {
    private channel: vscode.OutputChannel;
    private isDev: boolean;

    constructor(name: string) {
        this.channel = vscode.window.createOutputChannel(name);
        this.isDev = process.env.NODE_ENV === "development";
    }

    info(message: string, ...args: unknown[]): void {
        const formatted = this.format(message, args);
        this.channel.appendLine(formatted);

        // 开发时同时输出到 DEBUG CONSOLE
        if (this.isDev) {
            console.log(`[INFO] ${formatted}`);
        }
    }

    error(message: string, error?: Error): void {
        const formatted = error ? `${message}: ${error.message}` : message;
        this.channel.appendLine(`[ERROR] ${formatted}`);

        if (this.isDev) {
            console.error(`[ERROR] ${formatted}`, error);
        }
    }

    private format(message: string, args: unknown[]): string {
        const timestamp = new Date().toISOString();
        const argsStr = args.map((a) => String(a)).join(" ");
        return `[${timestamp}] ${message} ${argsStr}`.trim();
    }

    show(): void {
        this.channel.show();
    }
}

export const logger = new Logger("MyExtension");
```

#### 模式 2：使用 LogOutputChannel（VS Code 1.74+）

```typescript
export function activate(context: vscode.ExtensionContext) {
    // 创建支持日志级别的 OutputChannel
    const logChannel = vscode.window.createOutputChannel("MyExtension", { log: true });
    context.subscriptions.push(logChannel);

    // 不同级别的日志
    logChannel.info("Extension activated");
    logChannel.warn("Configuration not found, using defaults");
    logChannel.error("Failed to load data", new Error("Network error"));
}
```

### 7.6 最佳实践总结

| 场景                          | 推荐做法                          |
| ----------------------------- | --------------------------------- |
| **用户可见的日志**            | 使用 `OutputChannel.appendLine()` |
| **开发调试信息**              | 使用 `console.log()`              |
| **统一日志管理**              | 封装 Logger 类，同时支持两者      |
| **现代扩展（VS Code 1.74+）** | 使用 `LogOutputChannel` API       |

---

## 8. 参考链接

- [VS Code Extension API - Your First Extension](https://code.visualstudio.com/api/get-started/your-first-extension)
- [VS Code Extension API - Extension Host](https://code.visualstudio.com/api/advanced-topics/extension-host)
- [VS Code Debugging Documentation](https://code.visualstudio.com/docs/debugtest/debugging)
- [VS Code Extension Samples](https://github.com/microsoft/vscode-extension-samples)
- [VS Code 1.74 Release Notes - Log Output Channel](https://code.visualstudio.com/updates/v1_74#_log-output-channel)
- [VS Code Discussions - Standard Logger](https://github.com/microsoft/vscode-discussions/discussions/337)
