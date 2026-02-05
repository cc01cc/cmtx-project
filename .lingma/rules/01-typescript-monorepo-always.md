---
trigger: always_on
---
# TypeScript Monorepo 开发规范 (始终生效)

## 项目基本信息

- 项目类型：pnpm workspace 多包仓库
- 技术栈：TypeScript + ESM + NodeNext
- 包管理：pnpm 10+
- Node.js 版本：>= 18.x

## 核心开发规范

### TypeScript 配置

- 严格模式：启用 strict: true
- 模块解析：使用 NodeNext
- 导入路径：源码中必须使用 .js 后缀
- 示例：

```typescript
// 正确 ✅
import { parseImages } from './parser.js'

// 错误 ❌
import { parseImages } from './parser'
```

### 包结构规范

- 使用 workspace 协议引用内部包
- 包名格式：@cmtx/{package-name}
- 版本管理：开发阶段统一 0.1.0

### 代码组织

- 每个包保持独立的 src/ 和 tests/ 目录
- 公共类型定义放在 types.ts
- 常量定义放在 constants/ 目录
- 工具函数放在 utils.ts

### 设计原则

#### SOLID 原则

- **单一职责**：每个函数专注一个功能
- **开闭原则**：通过配置和接口支持扩展
- **依赖倒置**：通过回调注入依赖
- **接口隔离**：使用小而专注的接口

#### 其他重要原则

- **DRY (Don't Repeat Yourself)**：避免重复代码，提取公共逻辑到工具函数或模块中
- **YAGNI (You Aren't Gonna Need It)**：只实现当前需要的功能，避免过度设计和预测性编程
- **KISS (Keep It Simple, Stupid)**：保持代码简单直观，避免不必要的复杂性
- **简洁原则**：文档和注释应精简扼要，避免重复公共概念和冗余说明

### TypeDoc 注释规范

代码注释应遵循 TypeDoc 标准格式：

```typescript
/**
 * 函数功能简要描述
 * @param paramName - 参数说明
 * @returns 返回值说明
 * @throws {ErrorType} 异常情况说明
 */

/**
 * 类功能描述
 * 详细说明类的用途和主要功能
 */

/** 属性或变量的简要说明 */
```

- 使用 `/** */` 格式而非 `//` 行注释
- 参数使用 `@param` 标记
- 返回值使用 `@returns` 标记
- 异常使用 `@throws` 标记
- 保持注释简洁，重点突出功能和使用要点

### 代码风格与符号规范

#### 纯 ASCII 符号使用
- **禁止 Emoji 和 Unicode 符号**：使用纯 ASCII 字符（7-bit）
- **推荐符号**：`[OK] [FAIL] [WARN] [INFO] [x] [ ] -> <- /\ \/`
- **避免使用**：Unicode 符号（✓ ✗ → ↑）、Emoji（✅ ❌ 📋）、制表符绘图（┌ ─ └）
- **参考标准**：详见 [.github/SYMBOL_TABLE.md](../.github/SYMBOL_TABLE.md)

#### 注释规范
- 所有代码注释使用纯文本，不包含 Emoji
- 日志输出使用标准 ASCII 状态标记
- Markdown 文档遵循纯 ASCII 原则
- 保持符号语义唯一性和视觉对称性
