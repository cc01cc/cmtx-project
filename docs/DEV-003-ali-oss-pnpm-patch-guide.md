# DEV-003: 使用 pnpm patch 修复 ali-oss 打包问题

## 问题描述

在使用 `tsdown` 打包 VS Code 扩展 (`cmtx-vscode`) 时，ali-oss 包会导致打包报错。这是因为 ali-oss 源码中存在 TypeScript 类型导入问题。

## 问题分析

### 报错原因

ali-oss 包中的 `lib/common/utils/encoder.ts` 文件存在类型导入错误：

```typescript
// ali-oss/lib/common/utils/encoder.ts:1
import { THeaderEncoding } from "../../types/experimental"; // 缺少 type 修饰符
```

在使用 `tsdown` 打包时，由于配置了 `alwaysBundle: [/.*/]`，会将 ali-oss 及其依赖全部打包进输出文件。但 ali-oss 源码中的类型导入没有使用 `type` 修饰符，导致打包工具在处理时出现问题。

### 为什么需要 type 修饰符

在 TypeScript 中，当导入仅用于类型声明时，应该使用 `import type` 语法：

- `import { TypeA } from 'module'` - 可能被打包工具处理为运行时导入
- `import type { TypeA } from 'module'` - 明确告诉编译器这只是类型，不会产生运行时代码

对于像 `THeaderEncoding` 这样的纯类型，使用 `type` 修饰符可以避免打包工具将其作为运行时依赖处理。

## 解决方案：使用 pnpm patch

### 为什么选择 pnpm patch

项目使用 pnpm workspace 管理依赖，pnpm 提供了原生的 patch 机制：

- `pnpm patch <package>` - 创建可编辑的补丁环境
- `pnpm patch-commit <patch_dir>` - 提交修改并生成补丁文件
- 自动在 `pnpm-lock.yaml` 中记录 `patchedDependencies`
- 每次 `pnpm install` 时自动应用补丁

相比 `patch-package`，pnpm patch 是 pnpm 原生支持的，无需额外依赖和 postinstall 脚本。

### 完整操作步骤

#### 步骤 1：创建补丁环境

```bash
cd packages/vscode-extension
pnpm patch ali-oss
```

输出示例：

```
Patch: You can now edit the package at:

  /workspace/node_modules/.pnpm_patches/ali-oss@6.23.0

To commit your changes, run:

  pnpm patch-commit '/workspace/node_modules/.pnpm_patches/ali-oss@6.23.0'
```

#### 步骤 2：修改源码

编辑补丁目录中的文件：

```bash
# 文件路径：/workspace/node_modules/.pnpm_patches/ali-oss@6.23.0/lib/common/utils/encoder.ts
```

修改内容：

```diff
- import { THeaderEncoding } from '../../types/experimental';
+ import type { THeaderEncoding } from '../../types/experimental';
```

#### 步骤 3：提交补丁

```bash
pnpm patch-commit '/workspace/node_modules/.pnpm_patches/ali-oss@6.23.0'
```

这会自动：

1. 生成补丁文件 `patches/ali-oss.patch`
2. 更新 `pnpm-lock.yaml` 添加 `patchedDependencies` 记录
3. 将补丁应用到当前 `node_modules`

#### 步骤 4：验证补丁

检查补丁文件：

```bash
cat patches/ali-oss.patch
```

检查 pnpm-lock.yaml：

```bash
grep -A 5 "patchedDependencies" pnpm-lock.yaml
```

#### 步骤 5：测试打包

```bash
cd packages/vscode-extension
pnpm run build
```

## 补丁文件说明

生成的补丁文件 `patches/ali-oss.patch`：

```diff
diff --git a/lib/common/utils/encoder.ts b/lib/common/utils/encoder.ts
index 7476afb..bdc232b 100644
--- a/lib/common/utils/encoder.ts
+++ b/lib/common/utils/encoder.ts
@@ -1,4 +1,4 @@
-import { THeaderEncoding } from '../../types/experimental';
+import type { THeaderEncoding } from '../../types/experimental';

 export function encoder(str: string, encoding: THeaderEncoding = 'utf-8') {
```

## pnpm-lock.yaml 配置

补丁信息会自动记录在 `pnpm-lock.yaml` 中：

```yaml
patchedDependencies:
    ali-oss:
        hash: e57895c407cd4927d8a7195c1724fb3ab565c9dab56d90139193c7c69faf3175
        path: patches/ali-oss.patch
```

## 团队协作

### 提交到版本控制

确保提交以下文件：

```bash
git add patches/ali-oss.patch
git add pnpm-lock.yaml
git commit -m "fix: patch ali-oss type import error"
```

### 其他开发者使用

团队成员拉取代码后，执行：

```bash
pnpm install
```

pnpm 会自动：

1. 读取 `pnpm-lock.yaml` 中的 `patchedDependencies`
2. 找到对应的补丁文件 `patches/ali-oss.patch`
3. 在安装依赖时应用补丁

无需额外操作。

## 经验总结

### 1. pnpm patch vs patch-package

| 特性                      | pnpm patch            | patch-package                |
| ------------------------- | --------------------- | ---------------------------- |
| 是否需要额外依赖          | 否（pnpm 原生）       | 是（需要安装 patch-package） |
| 是否需要 postinstall 脚本 | 否（自动应用）        | 是（需要配置）               |
| pnpm workspace 兼容性     | 完美                  | 需要额外配置                 |
| 补丁文件位置              | 项目根目录 `patches/` | 包目录 `patches/`            |

**结论**：对于 pnpm 项目，优先使用 `pnpm patch`。

### 2. 补丁文件位置

在 pnpm workspace 中：

- 补丁文件默认生成在项目根目录的 `patches/` 下
- `pnpm-lock.yaml` 中的 `path` 字段记录相对路径
- 确保补丁文件被正确提交到版本控制

#### 2.1. 为什么补丁放在根目录（非 VS Code 扩展专用）

根目录 `patches/` 的摆放方式可能看起来像是 VS Code 扩展的专属目录（因为 `.vscodeignore` 中排除了 `patches/**`），但实际上 `ali-oss` patch 是**跨包共享的，与多个包相关**：

| 包 | 角色 |
|---|---|
| `@cmtx/storage` | 实现 ali-oss 存储适配器（核心消费者） |
| `@cmtx/cli` | CLI 工具（运行时依赖 ali-oss） |
| `@cmtx/mcp-server` | MCP 服务器（运行时依赖 ali-oss） |
| `@cmtx/markdown-it-presigned-url-adapter-nodejs` | 预签名 URL 适配器（运行时依赖 ali-oss） |
| `cmtx-vscode` | VS Code 扩展（打包时 bundle ali-oss） |

根目录 `patches/` 是正确的位置，理由如下：

1. **pnpm 设计如此**：`patchedDependencies` 是 workspace 级配置，路径解析以 workspace 根为基准，patch 会应用到所有依赖 `ali-oss` 的包
2. **标准实践**：`pnpm patch` 命令默认将补丁输出到工作区根目录的 `patches/`，这是约定俗成的标准
3. **`.vscodeignore` 排除 `patches/` 不等于"归属 VS Code 扩展"**：该排除仅表示补丁文件（修复的是第三方包 ali-oss 的源码问题）不应被打入 `.vsix` 包中
4. **避免误导**：如果挪到 `packages/vscode-extension/patches/`，会让其他开发者误以为其他包（`@cmtx/storage`, `@cmtx/cli` 等）不依赖此 patch，但实际它们都需要

### 3. 验证补丁生效

修改后验证步骤：

```bash
# 1. 检查 node_modules 中的文件是否已修改
cat node_modules/ali-oss/lib/common/utils/encoder.ts | head -5

# 2. 重新安装验证补丁自动应用
rm -rf node_modules
pnpm install
cat node_modules/ali-oss/lib/common/utils/encoder.ts | head -5

# 3. 执行打包验证
pnpm run build
```

### 4. 更新补丁

如果需要修改补丁：

```bash
# 1. 重新创建补丁环境
pnpm patch ali-oss

# 2. 进行修改

# 3. 提交新的补丁
pnpm patch-commit '/workspace/node_modules/.pnpm_patches/ali-oss@6.23.0'
```

旧的补丁文件会被自动更新。

### 5. 移除补丁

如果需要移除补丁：

1. 删除 `patches/ali-oss.patch` 文件
2. 手动编辑 `pnpm-lock.yaml`，删除 `patchedDependencies` 中的对应条目
3. 重新执行 `pnpm install`

## 相关文档

- [DEV-006-tsdown-dependency-bundling-guide.md](DEV-006-tsdown-dependency-bundling-guide.md) - tsdown 依赖打包指南
- [pnpm patch 官方文档](https://pnpm.io/cli/patch)
- [ali-oss GitHub](https://github.com/ali-sdk/ali-oss)

## 变更记录

| 日期       | 版本 | 描述                                       |
| ---------- | ---- | ------------------------------------------ |
| 2026-04-26 | 1.0  | 初始版本，记录 ali-oss pnpm patch 修复流程 |
| 2026-04-27 | 1.1  | 新增补丁位置分析，说明 patches/ 根目录的合理性及跨包共享关系 |
