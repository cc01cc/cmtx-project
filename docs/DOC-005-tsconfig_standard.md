# TypeScript 配置标准化指南

## 标准配置模板

### 开发配置 (tsconfig.json)

```json
{
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
        "noEmit": true,
        "types": ["node"],
        "baseUrl": "./"
    },
    "include": ["src", "bin"],
    "exclude": ["dist"]
}
```

### 构建配置 (tsconfig.build.json)

```json
{
    "extends": "./tsconfig.json",
    "compilerOptions": {
        "noEmit": false,
        "outDir": "dist",
        "rootDir": "src",
        "module": "NodeNext",
        "moduleResolution": "NodeNext",
        "types": ["node"],
        "stripInternal": true
    },
    "include": ["src/**/*"],
    "exclude": ["tests", "**/*.test.ts", "dist"]
}
```

## 配置原则

1. **开发/构建分离**：tsconfig.json 用于开发时类型检查，tsconfig.build.json 用于生产构建
2. **继承关系**：构建配置继承开发配置，而不是相反
3. **最小化配置**：只包含必要的选项，避免过度配置
4. **一致性**：所有包使用相同的配置模式

## 各包特殊考虑

### CLI 包

- 需要包含 bin 目录
- 可能需要额外的类型定义

### MCP-Server 包

- 需要包含 bin 目录
- 可能需要特定的模块解析配置

### 其他包

- 保持标准配置即可
