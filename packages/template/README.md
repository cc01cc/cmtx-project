# @cmtx/template

轻量级模板渲染引擎。提供灵活的模板变量管理和 Builder 模式 API。

[![npm version](https://img.shields.io/npm/v/@cmtx/template.svg)](https://www.npmjs.com/package/@cmtx/template)
[![License](https://img.shields.io/npm/l/@cmtx/template.svg)](https://github.com/cc01cc/cmtx-project/blob/main/LICENSE)

## 1. 特性

- **纯函数设计**：无副作用，易于测试
- **Builder 模式**：链式 API，使用直观
- **高度可扩展**：支持下游包继承扩展
- **零业务逻辑**：专注于模板渲染本身
- **类型安全**：完整的 TypeScript 支持

## 2. 安装

```bash
npm install @cmtx/template
# 或
yarn add @cmtx/template
# 或
pnpm add @cmtx/template
```

## 3. 快速开始

### 3.1. 基础用法

```typescript
import { renderTemplate } from "@cmtx/template";

const template = "Hello {name}! Today is {date}.";
const context = {
    name: "World",
    date: "2024-01-01",
};

const result = renderTemplate(template, context);
console.log(result); // "Hello World! Today is 2024-01-01."
```

### 3.2. 使用 Builder 模式

```typescript
import { BaseTemplateBuilder } from "@cmtx/template";

// 创建自定义 Builder
class MyBuilder extends BaseTemplateBuilder {
    withCustomData(data: any): this {
        this.addVariable("custom", data.value);
        return this;
    }

    build(): string {
        return JSON.stringify(this.getContext());
    }
}

const result = new MyBuilder().withDate().withCustomData({ value: "test" }).build();

console.log(result);
// {"date":"2024-01-01","timestamp":"1704067200000","uuid":"...","custom":"test"}
```

## 4. 核心概念

### 4.1. 模板语法

使用简单的 `{variable}` 语法：

```typescript
// 基本变量替换
'{name}' → 'John'

// 多个变量
'Hello {firstName} {lastName}!' → 'Hello John Doe!'

// 变量名中的空格会被自动处理
'{ user name }' → 'John' (如果 context['user name'] = 'John')
```

### 4.2. 内置变量

模板引擎提供以下内置变量：

- `date`：当前日期 (YYYY-MM-DD)
- `timestamp`：当前时间戳
- `uuid`：随机 UUID

```typescript
import { BaseTemplateBuilder } from "@cmtx/template";

const builder = new BaseTemplateBuilder();
const context = builder.getContext();

console.log(context.date); // "2024-01-01"
console.log(context.timestamp); // "1704067200000"
console.log(context.uuid); // "550e8400-e29b-41d4-a716-446655440000"
```

## 5. API 参考

### 5.1. 核心类型

#### 5.1.1. `TemplateContext`

模板上下文接口，定义模板渲染时可用的变量映射。

```typescript
interface TemplateContext {
    [key: string]: string | number | boolean | undefined;
    date?: string; // 内置变量：当前日期 (YYYY-MM-DD)
    timestamp?: string; // 内置变量：时间戳
    uuid?: string; // 内置变量：UUID
}
```

#### 5.1.2. `ValidationResult`

模板验证结果接口。

```typescript
interface ValidationResult {
    isValid: boolean; // 模板是否有效
    errors: string[]; // 错误信息列表
}
```

#### 5.1.3. `TemplateEngine`

模板引擎核心接口。

```typescript
interface TemplateEngine {
    render(template: string, context: TemplateContext): string;
    validate(template: string): ValidationResult;
}
```

### 5.2. 核心函数

#### 5.2.1. `renderTemplate(template: string, context: TemplateContext, options?: RenderTemplateOptions): string`

渲染模板字符串，使用简单的 `{variable}` 语法进行变量替换。

**参数：**

- `template`: 要渲染的模板字符串
- `context`: 上下文变量对象
- `options`: 可选配置项
    - `emptyString`: 空字符串处理策略 (`'replace'` | `'preserve'`)，默认 `'replace'`
    - `trimWhitespace`: 是否修剪变量名中的空格，默认 `true`
    - `postProcess`: 后处理函数 `(result: string) => string`

**返回值：** 渲染后的字符串

**异常：** 当参数类型不正确时抛出 `TypeError`

```typescript
import { renderTemplate } from "@cmtx/template";

// 基本用法
const result = renderTemplate("Hello {name}!", { name: "World" });
// 返回：'Hello World!'

// 多个变量
const multi = renderTemplate("{greeting} {name}!", {
    greeting: "Hello",
    name: "World",
});
// 返回：'Hello World!'

// 处理未定义变量
const undefinedVar = renderTemplate("Hello {name}!", {});
// 返回：'Hello {name}!'

// 使用 options 控制空字符串行为
const withEmptyString = renderTemplate(
    "Hello {name}!",
    { name: "" },
    {
        emptyString: "preserve", // 保留占位符
    },
);
// 返回：'Hello {name}!'

// 使用 trimWhitespace 控制变量名空格处理
const withTrim = renderTemplate(
    "{ user name }",
    { "user name": "World" },
    {
        trimWhitespace: true, // 默认行为，自动修剪
    },
);
// 返回：'Hello World!'

// 使用 postProcess 进行后处理
const withPostProcess = renderTemplate(
    "{path}/{file}",
    {
        path: "images/",
        file: "logo.png",
    },
    {
        postProcess: (result) => result.replace(/\/+/g, "/"), // 规范化路径
    },
);
// 返回：'images/logo.png'
```

#### 5.2.2. `validateTemplate(template: string): ValidationResult`

验证模板语法是否正确。

**参数：**

- `template`: 要验证的模板字符串

**返回值：** 包含验证结果的对象

```typescript
import { validateTemplate } from "@cmtx/template";

// 有效模板
const result = validateTemplate("Hello {name}!");
// 返回：{ isValid: true, errors: [] }

// 未闭合的大括号
const unclosed = validateTemplate("Hello {name!");
// 返回：{ isValid: false, errors: ['大括号不匹配：找到 1 个 opening brace 和 0 个 closing brace'] }

// 空的大括号
const empty = validateTemplate("Hello {}!");
// 返回：{ isValid: false, errors: ['空的模板变量：{}'] }
```

### 5.3. 类

#### 5.3.1. `ContextManager`

上下文管理器，负责管理模板渲染所需的变量上下文。

**方法：**

- `set(key: string, value: string | number | boolean): void` - 添加单个变量
- `setMany(variables: Record<string, string | number | boolean>): void` - 批量添加变量
- `get(): TemplateContext` - 获取上下文副本
- `clear(): void` - 清空上下文
- `merge(other: TemplateContext): void` - 合并另一个上下文
- `has(key: string): boolean` - 检查变量是否存在
- `delete(key: string): void` - 删除指定变量

#### 5.3.2. `BuiltinVariables`

内置变量提供者，提供常用的系统变量。

**静态方法：**

- `getDate(): string` - 获取当前日期
- `getTimestamp(): string` - 获取当前时间戳
- `getUUID(): string` - 生成 UUID
- `getAll(): TemplateContext` - 获取所有内置变量

#### 5.3.3. `BaseTemplateBuilder`

Builder 模式的基类，提供链式 API。

**方法：**

- `withDate(): this` - 添加当前日期
- `withTimestamp(): this` - 添加时间戳
- `withUUID(): this` - 添加 UUID
- `addVariable(key: string, value: string | number | boolean): this` - 添加自定义变量
- `addVariables(variables: Record<string, string | number | boolean>): this` - 批量添加变量
- `merge(context: TemplateContext): this` - 合并上下文
- `getContext(): TemplateContext` - 获取当前上下文
- `clear(): this` - 清空变量（保留内置变量）
- `build(): string | TemplateContext` - 抽象方法，子类需实现

## 6. 扩展示例

### 6.1. 创建自定义 Builder

```typescript
import { BaseTemplateBuilder } from "@cmtx/template";

// 为特定业务场景创建 Builder
class FileNamingBuilder extends BaseTemplateBuilder {
    withFileInfo(fileName: string, fileSize: number): this {
        this.addVariable("filename", fileName);
        this.addVariable("filesize", fileSize);
        return this;
    }

    build(): string {
        const context = this.getContext();
        return `${context.date}_${context.filename}`;
    }
}

// 使用示例
const fileName = new FileNamingBuilder().withFileInfo("document.pdf", 1024).build();

console.log(fileName); // "2024-01-01_document.pdf"
```

## 7. 开发

```bash
# 安装依赖
pnpm install

# 构建
pnpm build

# 运行测试
pnpm test

# 生成文档
pnpm docs
```

## 8. 许可证

Apache-2.0

## 9. 相关项目

- [@cmtx/core](../core) - 文档处理原子操作库
- [@cmtx/asset](../asset) - 文件上传和处理工具
