# pnpm Catalogs 配置说明

## 概述

本项目使用 pnpm 的 Catalogs 功能来集中管理依赖版本，类似于 Spring Boot 的 Parent POM 机制。

## 配置结构

### pnpm-workspace.yaml

```yaml
catalog:
    # 云存储 SDK
    "@types/ali-oss": ^6.23.2
    "@types/vscode": ^1.93.0
    "@vscode/vsce": ^3.3.2
    ali-oss: ^6.23.0
    cos-nodejs-sdk-v5: ^2.14.0

    # 测试与构建
    "@vitest/coverage-v8": ^4.0.18
    esbuild: ^0.27.4
    tinyglobby: ^0.2.0
    trash: ^10.1.0
    typedoc: ^0.28.16
    typescript: ^6.0.3
    vitest: ^4.0.18

    # 类型定义
    "@types/node": ^25.2.1

catalogs:
    # 开发工具目录
    dev:
        dotenv: ^17.2.4
        rimraf: ^6.1.2
        tsx: ^4.21.0

    # CLI 相关目录
    cli:
        "@types/js-yaml": 4.0.9
        "@types/yargs": ^17.0.35
        chalk: ^5.6.2
        js-yaml: 4.1.1
        ora: ^9.2.0
        yargs: ^18.0.0
```

## 使用方式

### 默认目录引用

```json
{
    "devDependencies": {
        "typescript": "catalog:",
        "@types/node": "catalog:",
        "vitest": "catalog:"
    }
}
```

### 命名目录引用

```json
{
    "devDependencies": {
        "rimraf": "catalog:dev",
        "chalk": "catalog:cli"
    }
}
```

## 优势

1. **版本统一**：所有包使用相同的依赖版本
2. **易于维护**：只需在一处修改版本号
3. **减少冲突**：避免版本不一致导致的问题
4. **简化升级**：批量升级依赖版本更简单

## 注意事项

- Workspace 协议 (`workspace:*`) 不能通过 catalogs 管理
- 发布时 catalog 引用会自动转换为具体版本号
- 建议定期审查和清理未使用的 catalog 条目

## 验证命令

```bash
# 检查依赖解析
pnpm list <package-name>

# 强制重新安装
pnpm install --force

# 构建验证
pnpm run build
```
