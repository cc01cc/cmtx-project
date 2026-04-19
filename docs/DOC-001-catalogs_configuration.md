# pnpm Catalogs 配置说明

## 概述

本项目使用 pnpm 的 Catalogs 功能来集中管理依赖版本，类似于 Spring Boot 的 Parent POM 机制。

## 配置结构

### pnpm-workspace.yaml

```yaml
catalog:
  # 核心构建工具
  typescript: ^5.9.3
  
  # 测试框架
  vitest: ^4.0.18
  "@vitest/coverage-v8": ^4.0.18
  
  # 文档生成
  typedoc: ^0.28.16
  
  # 代码质量
  eslint: ^10.0.0
  "@types/node": ^25.2.1
  
  # 文件操作
  "fast-glob": ^3.3.3
  trash: ^10.1.0
  
  # 阿里云 OSS
  "ali-oss": ^6.23.0
  "@types/ali-oss": ^6.23.2

catalogs:
  # 开发工具目录
  dev:
    rimraf: ^6.1.2
    dotenv: ^17.2.4
    tsx: ^4.21.0
  
  # CLI 相关目录
  cli:
    chalk: ^5.6.2
    "js-yaml": 4.1.1
    "@types/js-yaml": 4.0.9
    ora: ^9.2.0
    yargs: ^18.0.0
    "@types/yargs": ^17.0.35
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