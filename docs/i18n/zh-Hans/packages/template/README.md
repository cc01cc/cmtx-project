---
title: "@cmtx/template"
category: guide
sidebar_order: 3
lang: zh-Hans
---

# @cmtx/template

轻量级模板渲染引擎，使用 `{variable}` 语法进行变量替换。

[![npm version](https://img.shields.io/npm/v/@cmtx/template.svg)](https://www.npmjs.com/package/@cmtx/template)
[![License](https://img.shields.io/npm/l/@cmtx/template.svg)](https://github.com/cc01cc/cmtx-project/blob/main/LICENSE)

## 1. 特性

- **纯函数设计**：无副作用，易于测试
- **零业务逻辑**：专注于模板渲染本身
- **类型安全**：完整的 TypeScript 支持

## 2. 安装

```bash
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

## 6. 开发

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

## 7. 许可证

Apache-2.0

## 8. 相关项目

- [@cmtx/core](../core) - 文档处理原子操作库
- [@cmtx/asset](../asset) - 文件上传和处理工具
