# Package.json 标准化配置指南

## 标准配置模板

### 公开发布的包
```json
{
  "name": "@cmtx/package-name",
  "version": "0.1.0",
  "description": "包描述",
  "license": "Apache-2.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "repository": {
    "type": "git",
    "url": "https://github.com/cc01cc/cmtx-project.git",
    "directory": "packages/package-name"
  },
  "bugs": {
    "url": "https://github.com/cc01cc/cmtx-project/issues"
  },
  "homepage": "https://github.com/cc01cc/cmtx-project",
  "author": "cc01cc",
  "keywords": ["关键词1", "关键词2", "cmtx"],
  "publishConfig": {
    "access": "public"
  },
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "test": "vitest run",
    "test:watch": "vitest",
    "docs": "typedoc",
    "lint": "eslint src tests --fix"
  }
}
```

### 私有工具包
```json
{
  "name": "@cmtx/tool-name",
  "version": "0.1.0",
  "description": "工具描述",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "command-name": "./dist/bin/command.js"
  },
  "files": ["dist", "bin"],
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

## 配置原则

1. **版本号统一**：开发阶段统一使用 `0.1.0` 版本
2. **发布状态明确**：公开包不设置 private，私有工具包设置 private
3. **依赖管理**：优先使用 catalogs 引用
4. **测试脚本**：统一使用 `vitest run` 作为默认测试命令
5. **字段完整性**：确保必要字段不缺失